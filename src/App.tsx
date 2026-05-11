/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "framer-motion";
import { 
  PenTool, 
  FileCheck, 
  Landmark, 
  ArrowRight,
  ShieldAlert,
  Fingerprint
} from "lucide-react";

const MODULES = [
  {
    id: "finance",
    title: "微金融服务",
    desc: "融资协议签署体验，集成演示原生组件调用与业务流转能力。",
    icon: Landmark,
    theme: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    link: "/direct.html",
  },
  {
    id: "business",
    title: "业务办理端",
    desc: "个人信贷申请流程模拟，演示跨页面状态保持及签名结果防篡改回调。",
    icon: FileCheck,
    theme: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    link: "/fintest.html",
  },
  {
    id: "signature",
    title: "数字签名中台",
    desc: "提供移动端防失真手写板，输出标准化坐标数据矩阵及白底黑字图像。",
    icon: PenTool,
    theme: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    link: "/write.html",
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-sm">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              DevPortal
            </span>
          </div>
          <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">业务验证环境</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 lg:py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-12 sm:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4 md:mb-6">
            业务流转中台与<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              数字签名组件库
            </span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed font-medium max-w-xl">
            提供从业务发起、交互流转到最终数字协议签署的完整链路演示验证环境。请选择下方功能模块进行前台体验。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <motion.a
                href={mod.link}
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 + 0.2 }}
                className="group relative bg-white rounded-2xl p-6 sm:p-8 flex flex-col h-full border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className={`w-14 h-14 rounded-xl ${mod.bg} ${mod.border} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ease-out fill-mode-forwards`}>
                  <Icon className={`w-7 h-7 ${mod.theme}`} strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">
                  {mod.title}
                </h3>
                
                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">
                  {mod.desc}
                </p>

                <div className="flex items-center text-sm font-semibold text-gray-400 group-hover:text-blue-600 transition-colors mt-auto">
                  <span>进入模块</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
