/*!
 * Signature Pad v5.1.3
 * https://github.com/szimek/signature_pad
 * (c) 2025 Szymon Nowak | Released under the MIT license
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.SignaturePad = factory());
})(this, (function () {
  'use strict';

  class Point {
    constructor(x, y, pressure, time) {
      if (isNaN(x) || isNaN(y)) {
        throw new Error(`Point is invalid: (${x}, ${y})`);
      }
      this.x = +x;
      this.y = +y;
      this.pressure = pressure || 0;
      this.time = time || Date.now();
    }
    distanceTo(start) {
      return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
    }
    equals(other) {
      return this.x === other.x && this.y === other.y && this.pressure === other.pressure && this.time === other.time;
    }
    velocityFrom(start) {
      return this.time !== start.time ? this.distanceTo(start) / (this.time - start.time) : 0;
    }
  }

  class Bezier {
    constructor(startPoint, control2, control1, endPoint, startWidth, endWidth) {
      this.startPoint = startPoint;
      this.control2 = control2;
      this.control1 = control1;
      this.endPoint = endPoint;
      this.startWidth = startWidth;
      this.endWidth = endWidth;
    }
    static fromPoints(points, widths) {
      let c2 = this.calculateControlPoints(points[0], points[1], points[2]).c2;
      let c1 = this.calculateControlPoints(points[1], points[2], points[3]).c1;
      return new Bezier(points[1], c2, c1, points[2], widths.start, widths.end);
    }
    static calculateControlPoints(s1, s2, s3) {
      let dx1 = s1.x - s2.x;
      let dy1 = s1.y - s2.y;
      let dx2 = s2.x - s3.x;
      let dy2 = s2.y - s3.y;
      let m1 = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };
      let m2 = { x: (s2.x + s3.x) / 2, y: (s2.y + s3.y) / 2 };
      let l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      let l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      let dxm = m1.x - m2.x;
      let dym = m1.y - m2.y;
      let k = l2 / (l1 + l2);
      k = isNaN(k) ? 0 : k;
      let cm = { x: m2.x + dxm * k, y: m2.y + dym * k };
      let tx = s2.x - cm.x;
      let ty = s2.y - cm.y;
      return {
        c1: new Point(m1.x + tx, m1.y + ty),
        c2: new Point(m2.x + tx, m2.y + ty)
      };
    }
    length() {
      let steps = 10;
      let length = 0;
      let px;
      let py;
      for (let i = 0; i <= steps; i += 1) {
        let t = i / steps;
        let cx = this.point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
        let cy = this.point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
        if (i > 0) {
          let xdiff = cx - px;
          let ydiff = cy - py;
          length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
        }
        px = cx;
        py = cy;
      }
      return length;
    }
    point(t, start, c1, c2, end) {
      return start * (1 - t) * (1 - t) * (1 - t) + 3 * c1 * (1 - t) * (1 - t) * t + 3 * c2 * (1 - t) * t * t + end * t * t * t;
    }
  }

  class SignatureEventTarget {
    constructor() {
      try {
        this._et = new EventTarget();
      } catch (error) {
        this._et = document;
      }
    }
    addEventListener(type, listener, options) {
      this._et.addEventListener(type, listener, options);
    }
    dispatchEvent(event) {
      return this._et.dispatchEvent(event);
    }
    removeEventListener(type, callback, options) {
      this._et.removeEventListener(type, callback, options);
    }
  }

  function throttle(fn, wait = 250) {
    let previous = 0;
    let timeout = null;
    let result;
    let storedContext;
    let storedArgs;
    let later = () => {
      previous = Date.now();
      timeout = null;
      result = fn.apply(storedContext, storedArgs);
      if (!timeout) {
        storedContext = null;
        storedArgs =[];
      }
    };
    return function (...args) {
      let now = Date.now();
      let remaining = wait - (now - previous);
      storedContext = this;
      storedArgs = args;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = fn.apply(storedContext, storedArgs);
        if (!timeout) {
          storedContext = null;
          storedArgs =[];
        }
      } else if (!timeout) {
        timeout = window.setTimeout(later, remaining);
      }
      return result;
    };
  }

  class SignaturePad extends SignatureEventTarget {
    constructor(canvas, options = {}) {
      super();
      this.canvas = canvas;
      this.velocityFilterWeight = options.velocityFilterWeight || 0.7;
      this.minWidth = options.minWidth || 0.5;
      this.maxWidth = options.maxWidth || 2.5;
      this.throttle = options.throttle ?? 16;
      this.minDistance = options.minDistance ?? 5;
      this.dotSize = options.dotSize || 0;
      this.penColor = options.penColor || "black";
      this.backgroundColor = options.backgroundColor || "rgba(0,0,0,0)";
      this.compositeOperation = options.compositeOperation || "source-over";
      this.canvasContextOptions = options.canvasContextOptions ?? {};
      
      this._strokeMoveUpdate = this.throttle ? throttle(SignaturePad.prototype._strokeUpdate, this.throttle) : SignaturePad.prototype._strokeUpdate;
      
      this._handleMouseDown = this._handleMouseDown.bind(this);
      this._handleMouseMove = this._handleMouseMove.bind(this);
      this._handleMouseUp = this._handleMouseUp.bind(this);
      this._handleTouchStart = this._handleTouchStart.bind(this);
      this._handleTouchMove = this._handleTouchMove.bind(this);
      this._handleTouchEnd = this._handleTouchEnd.bind(this);
      this._handlePointerDown = this._handlePointerDown.bind(this);
      this._handlePointerMove = this._handlePointerMove.bind(this);
      this._handlePointerUp = this._handlePointerUp.bind(this);
      this._handlePointerCancel = this._handlePointerCancel.bind(this);
      this._handleTouchCancel = this._handleTouchCancel.bind(this);
      
      this._ctx = canvas.getContext("2d", this.canvasContextOptions);
      this.clear();
      this.on();
    }
    
    _drawingStroke = false;
    _isEmpty = true;
    _lastPoints = [];
    _data =[];
    _lastVelocity = 0;
    _lastWidth = 0;
    
    clear() {
      let ctx = this._ctx;
      let canvas = this.canvas;
      ctx.fillStyle = this.backgroundColor;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this._data =[];
      this._reset(this._getPointGroupOptions());
      this._isEmpty = true;
      this._dataUrl = undefined;
      this._dataUrlOptions = undefined;
      this._strokePointerId = undefined;
    }
    redraw() {
      let data = this._data;
      let dataUrl = this._dataUrl;
      let dataUrlOptions = this._dataUrlOptions;
      this.clear();
      if (dataUrl) this.fromDataURL(dataUrl, dataUrlOptions);
      this.fromData(data, { clear: false });
    }
    fromDataURL(dataUrl, options = {}) {
      return new Promise((resolve, reject) => {
        let image = new Image();
        let ratio = options.ratio || window.devicePixelRatio || 1;
        let width = options.width || this.canvas.width / ratio;
        let height = options.height || this.canvas.height / ratio;
        let xOffset = options.xOffset || 0;
        let yOffset = options.yOffset || 0;
        this._reset(this._getPointGroupOptions());
        image.onload = () => {
          this._ctx.drawImage(image, xOffset, yOffset, width, height);
          resolve();
        };
        image.onerror = (error) => {
          reject(error);
        };
        image.crossOrigin = "anonymous";
        image.src = dataUrl;
        this._isEmpty = false;
        this._dataUrl = dataUrl;
        this._dataUrlOptions = { ...options };
      });
    }
    toDataURL(type = "image/png", encoderOptions) {
      switch (type) {
        case "image/svg+xml":
          if (typeof encoderOptions !== "object") encoderOptions = undefined;
          return `data:image/svg+xml;base64,${btoa(this.toSVG(encoderOptions))}`;
        default:
          if (typeof encoderOptions !== "number") encoderOptions = undefined;
          return this.canvas.toDataURL(type, encoderOptions);
      }
    }
    on() {
      this.canvas.style.touchAction = "none";
      this.canvas.style.msTouchAction = "none";
      this.canvas.style.userSelect = "none";
      this.canvas.style.webkitUserSelect = "none";
      let isMacTouch = /Macintosh/.test(navigator.userAgent) && "ontouchstart" in document;
      if (window.PointerEvent && !isMacTouch) {
        this._handlePointerEvents();
      } else {
        this._handleMouseEvents();
        if ("ontouchstart" in window) {
          this._handleTouchEvents();
        }
      }
    }
    off() {
      this.canvas.style.touchAction = "auto";
      this.canvas.style.msTouchAction = "auto";
      this.canvas.style.userSelect = "auto";
      this.canvas.style.webkitUserSelect = "auto";
      this.canvas.removeEventListener("pointerdown", this._handlePointerDown);
      this.canvas.removeEventListener("mousedown", this._handleMouseDown);
      this.canvas.removeEventListener("touchstart", this._handleTouchStart);
      this._removeMoveUpEventListeners();
    }
    _getListenerFunctions() {
      let view = window.document === this.canvas.ownerDocument ? window : this.canvas.ownerDocument.defaultView ?? this.canvas.ownerDocument;
      return {
        addEventListener: view.addEventListener.bind(view),
        removeEventListener: view.removeEventListener.bind(view)
      };
    }
    _removeMoveUpEventListeners() {
      let { removeEventListener } = this._getListenerFunctions();
      removeEventListener("pointermove", this._handlePointerMove);
      removeEventListener("pointerup", this._handlePointerUp);
      removeEventListener("pointercancel", this._handlePointerCancel);
      removeEventListener("mousemove", this._handleMouseMove);
      removeEventListener("mouseup", this._handleMouseUp);
      removeEventListener("touchmove", this._handleTouchMove);
      removeEventListener("touchend", this._handleTouchEnd);
      removeEventListener("touchcancel", this._handleTouchCancel);
    }
    isEmpty() {
      return this._isEmpty;
    }
    fromData(pointGroups, { clear = true } = {}) {
      if (clear) this.clear();
      this._fromData(pointGroups, this._drawCurve.bind(this), this._drawDot.bind(this));
      this._data = this._data.concat(pointGroups);
    }
    toData() {
      return this._data;
    }
    _isLeftButtonPressed(event, only) {
      return only ? event.buttons === 1 : (event.buttons & 1) === 1;
    }
    _pointerEventToSignatureEvent(event) {
      return {
        event: event,
        type: event.type,
        x: event.clientX,
        y: event.clientY,
        pressure: "pressure" in event ? event.pressure : 0
      };
    }
    _touchEventToSignatureEvent(event) {
      let touch = event.changedTouches[0];
      return {
        event: event,
        type: event.type,
        x: touch.clientX,
        y: touch.clientY,
        pressure: touch.force
      };
    }
    _handleMouseDown(event) {
      if (!this._isLeftButtonPressed(event, true) || this._drawingStroke) return;
      this._strokeBegin(this._pointerEventToSignatureEvent(event));
    }
    _handleMouseMove(event) {
      if (!this._isLeftButtonPressed(event, true) || !this._drawingStroke) {
        this._strokeEnd(this._pointerEventToSignatureEvent(event), false);
        return;
      }
      this._strokeMoveUpdate(this._pointerEventToSignatureEvent(event));
    }
    _handleMouseUp(event) {
      if (this._isLeftButtonPressed(event)) return;
      this._strokeEnd(this._pointerEventToSignatureEvent(event));
    }
    _handleTouchStart(event) {
      if (event.targetTouches.length !== 1 || this._drawingStroke) return;
      if (event.cancelable) event.preventDefault();
      this._strokeBegin(this._touchEventToSignatureEvent(event));
    }
    _handleTouchMove(event) {
      if (event.targetTouches.length === 1) {
        if (event.cancelable) event.preventDefault();
        if (!this._drawingStroke) {
          this._strokeEnd(this._touchEventToSignatureEvent(event), false);
          return;
        }
        this._strokeMoveUpdate(this._touchEventToSignatureEvent(event));
      }
    }
    _handleTouchEnd(event) {
      if (event.targetTouches.length === 0) {
        if (event.cancelable) event.preventDefault();
        this._strokeEnd(this._touchEventToSignatureEvent(event));
      }
    }
    _handlePointerCancel(event) {
      if (this._allowPointerId(event)) {
        event.preventDefault();
        this._strokeEnd(this._pointerEventToSignatureEvent(event), false);
      }
    }
    _handleTouchCancel(event) {
      if (event.cancelable) event.preventDefault();
      this._strokeEnd(this._touchEventToSignatureEvent(event), false);
    }
    _getPointerId(event) {
      return event.persistentDeviceId || event.pointerId;
    }
    _allowPointerId(event, isDown = false) {
      return typeof this._strokePointerId === "undefined" ? isDown : this._getPointerId(event) === this._strokePointerId;
    }
    _handlePointerDown(event) {
      if (this._drawingStroke || !this._isLeftButtonPressed(event) || !this._allowPointerId(event, true)) return;
      this._strokePointerId = this._getPointerId(event);
      event.preventDefault();
      this._strokeBegin(this._pointerEventToSignatureEvent(event));
    }
    _handlePointerMove(event) {
      if (this._allowPointerId(event)) {
        if (!this._isLeftButtonPressed(event, true) || !this._drawingStroke) {
          this._strokeEnd(this._pointerEventToSignatureEvent(event), false);
          return;
        }
        event.preventDefault();
        this._strokeMoveUpdate(this._pointerEventToSignatureEvent(event));
      }
    }
    _handlePointerUp(event) {
      if (this._isLeftButtonPressed(event) || !this._allowPointerId(event)) return;
      event.preventDefault();
      this._strokeEnd(this._pointerEventToSignatureEvent(event));
    }
    _getPointGroupOptions(group) {
      return {
        penColor: group && "penColor" in group ? group.penColor : this.penColor,
        dotSize: group && "dotSize" in group ? group.dotSize : this.dotSize,
        minWidth: group && "minWidth" in group ? group.minWidth : this.minWidth,
        maxWidth: group && "maxWidth" in group ? group.maxWidth : this.maxWidth,
        velocityFilterWeight: group && "velocityFilterWeight" in group ? group.velocityFilterWeight : this.velocityFilterWeight,
        compositeOperation: group && "compositeOperation" in group ? group.compositeOperation : this.compositeOperation
      };
    }
    _strokeBegin(event) {
      if (!this.dispatchEvent(new CustomEvent("beginStroke", { detail: event, cancelable: true }))) return;
      let { addEventListener } = this._getListenerFunctions();
      switch (event.event.type) {
        case "mousedown":
          addEventListener("mousemove", this._handleMouseMove, { passive: false });
          addEventListener("mouseup", this._handleMouseUp, { passive: false });
          break;
        case "touchstart":
          addEventListener("touchmove", this._handleTouchMove, { passive: false });
          addEventListener("touchend", this._handleTouchEnd, { passive: false });
          addEventListener("touchcancel", this._handleTouchCancel, { passive: false });
          break;
        case "pointerdown":
          addEventListener("pointermove", this._handlePointerMove, { passive: false });
          addEventListener("pointerup", this._handlePointerUp, { passive: false });
          addEventListener("pointercancel", this._handlePointerCancel, { passive: false });
          break;
        default:
      }
      this._drawingStroke = true;
      let options = this._getPointGroupOptions();
      let pointGroup = { ...options, points:[] };
      this._data.push(pointGroup);
      this._reset(options);
      this._strokeUpdate(event);
    }
    _strokeUpdate(event) {
      if (!this._drawingStroke) return;
      if (this._data.length === 0) {
        this._strokeBegin(event);
        return;
      }
      this.dispatchEvent(new CustomEvent("beforeUpdateStroke", { detail: event }));
      let point = this._createPoint(event.x, event.y, event.pressure);
      let pointGroup = this._data[this._data.length - 1];
      let points = pointGroup.points;
      let lastPoint = points.length > 0 && points[points.length - 1];
      let isTooClose = lastPoint ? point.distanceTo(lastPoint) <= this.minDistance : false;
      let options = this._getPointGroupOptions(pointGroup);
      if (!lastPoint || !(lastPoint && isTooClose)) {
        let curve = this._addPoint(point, options);
        if (!lastPoint) {
          this._drawDot(point, options);
        } else if (curve) {
          this._drawCurve(curve, options);
        }
        points.push({ time: point.time, x: point.x, y: point.y, pressure: point.pressure });
      }
      this.dispatchEvent(new CustomEvent("afterUpdateStroke", { detail: event }));
    }
    _strokeEnd(event, update = true) {
      this._removeMoveUpEventListeners();
      if (this._drawingStroke) {
        if (update) this._strokeUpdate(event);
        this._drawingStroke = false;
        this._strokePointerId = undefined;
        this.dispatchEvent(new CustomEvent("endStroke", { detail: event }));
      }
    }
    _handlePointerEvents() {
      this._drawingStroke = false;
      this.canvas.addEventListener("pointerdown", this._handlePointerDown, { passive: false });
    }
    _handleMouseEvents() {
      this._drawingStroke = false;
      this.canvas.addEventListener("mousedown", this._handleMouseDown, { passive: false });
    }
    _handleTouchEvents() {
      this.canvas.addEventListener("touchstart", this._handleTouchStart, { passive: false });
    }
    _reset(options) {
      this._lastPoints =[];
      this._lastVelocity = 0;
      this._lastWidth = (options.minWidth + options.maxWidth) / 2;
      this._ctx.fillStyle = options.penColor;
      this._ctx.globalCompositeOperation = options.compositeOperation;
    }
    _createPoint(x, y, pressure) {
      let rect = this.canvas.getBoundingClientRect();
      return new Point(x - rect.left, y - rect.top, pressure, new Date().getTime());
    }
    _addPoint(point, options) {
      let points = this._lastPoints;
      points.push(point);
      if (points.length > 2) {
        if (points.length === 3) points.unshift(points[0]);
        let widths = this._calculateCurveWidths(points[1], points[2], options);
        let curve = Bezier.fromPoints(points, widths);
        points.shift();
        return curve;
      }
      return null;
    }
    _calculateCurveWidths(startPoint, endPoint, options) {
      let velocity = options.velocityFilterWeight * endPoint.velocityFrom(startPoint) + (1 - options.velocityFilterWeight) * this._lastVelocity;
      let newWidth = this._strokeWidth(velocity, options);
      let widths = { end: newWidth, start: this._lastWidth };
      this._lastVelocity = velocity;
      this._lastWidth = newWidth;
      return widths;
    }
    _strokeWidth(velocity, options) {
      return Math.max(options.maxWidth / (velocity + 1), options.minWidth);
    }
    _drawCurveSegment(x, y, width) {
      let ctx = this._ctx;
      ctx.moveTo(x, y);
      ctx.arc(x, y, width, 0, 2 * Math.PI, false);
      this._isEmpty = false;
    }
    _drawCurve(curve, options) {
      let ctx = this._ctx;
      let widthDelta = curve.endWidth - curve.startWidth;
      let drawSteps = Math.ceil(curve.length()) * 2;
      ctx.beginPath();
      ctx.fillStyle = options.penColor;
      for (let i = 0; i < drawSteps; i += 1) {
        let t = i / drawSteps;
        let tt = t * t;
        let ttt = tt * t;
        let u = 1 - t;
        let uu = u * u;
        let uuu = uu * u;
        let x = uuu * curve.startPoint.x;
        x += 3 * uu * t * curve.control1.x;
        x += 3 * u * tt * curve.control2.x;
        x += ttt * curve.endPoint.x;
        let y = uuu * curve.startPoint.y;
        y += 3 * uu * t * curve.control1.y;
        y += 3 * u * tt * curve.control2.y;
        y += ttt * curve.endPoint.y;
        let width = Math.min(curve.startWidth + ttt * widthDelta, options.maxWidth);
        this._drawCurveSegment(x, y, width);
      }
      ctx.closePath();
      ctx.fill();
    }
    _drawDot(point, options) {
      let ctx = this._ctx;
      let width = options.dotSize > 0 ? options.dotSize : (options.minWidth + options.maxWidth) / 2;
      ctx.beginPath();
      this._drawCurveSegment(point.x, point.y, width);
      ctx.closePath();
      ctx.fillStyle = options.penColor;
      ctx.fill();
    }
    _fromData(pointGroups, drawCurve, drawDot) {
      for (let group of pointGroups) {
        let points = group.points;
        let options = this._getPointGroupOptions(group);
        if (points.length > 1) {
          for (let i = 0; i < points.length; i += 1) {
            let point = points[i];
            let p = new Point(point.x, point.y, point.pressure, point.time);
            if (i === 0) this._reset(options);
            let curve = this._addPoint(p, options);
            if (curve) drawCurve(curve, options);
          }
        } else {
          this._reset(options);
          drawDot(points[0], options);
        }
      }
    }
    toSVG({ includeBackgroundColor = false, includeDataUrl = false } = {}) {
      let data = this._data;
      let ratio = Math.max(window.devicePixelRatio || 1, 1);
      let minX = 0;
      let minY = 0;
      let width = this.canvas.width / ratio;
      let height = this.canvas.height / ratio;
      let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
      svg.setAttribute("width", width.toString());
      svg.setAttribute("height", height.toString());
      if (includeBackgroundColor && this.backgroundColor) {
        let rect = document.createElement("rect");
        rect.setAttribute("width", "100%");
        rect.setAttribute("height", "100%");
        rect.setAttribute("fill", this.backgroundColor);
        svg.appendChild(rect);
      }
      if (includeDataUrl && this._dataUrl) {
        let imgRatio = this._dataUrlOptions?.ratio || window.devicePixelRatio || 1;
        let imgWidth = this._dataUrlOptions?.width || this.canvas.width / imgRatio;
        let imgHeight = this._dataUrlOptions?.height || this.canvas.height / imgRatio;
        let xOffset = this._dataUrlOptions?.xOffset || 0;
        let yOffset = this._dataUrlOptions?.yOffset || 0;
        let image = document.createElement("image");
        image.setAttribute("x", xOffset.toString());
        image.setAttribute("y", yOffset.toString());
        image.setAttribute("width", imgWidth.toString());
        image.setAttribute("height", imgHeight.toString());
        image.setAttribute("preserveAspectRatio", "none");
        image.setAttribute("href", this._dataUrl);
        svg.appendChild(image);
      }
      this._fromData(data, (curve, { penColor }) => {
        let path = document.createElement("path");
        if (!isNaN(curve.control1.x) && !isNaN(curve.control1.y) && !isNaN(curve.control2.x) && !isNaN(curve.control2.y)) {
          let d = `M ${curve.startPoint.x.toFixed(3)},${curve.startPoint.y.toFixed(3)} C ${curve.control1.x.toFixed(3)},${curve.control1.y.toFixed(3)} ${curve.control2.x.toFixed(3)},${curve.control2.y.toFixed(3)} ${curve.endPoint.x.toFixed(3)},${curve.endPoint.y.toFixed(3)}`;
          path.setAttribute("d", d);
          path.setAttribute("stroke-width", (curve.endWidth * 2.25).toFixed(3));
          path.setAttribute("stroke", penColor);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke-linecap", "round");
          svg.appendChild(path);
        }
      }, (point, { penColor, dotSize, minWidth, maxWidth }) => {
        let circle = document.createElement("circle");
        let size = dotSize > 0 ? dotSize : (minWidth + maxWidth) / 2;
        circle.setAttribute("r", size.toString());
        circle.setAttribute("cx", point.x.toString());
        circle.setAttribute("cy", point.y.toString());
        circle.setAttribute("fill", penColor);
        svg.appendChild(circle);
      });
      return svg.outerHTML;
    }
  }

  return SignaturePad;
}));