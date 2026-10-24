import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface JiangnanGameAppProps {
  onClose: () => void;
}

const JiangnanGameApp: React.FC<JiangnanGameAppProps> = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#10191C]">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#10191C] text-[#D7E1DE]">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Loader2 className="h-5 w-5 animate-spin text-[#D5B77B]" />
            正在进入江南战场
          </div>
        </div>
      )}
      <iframe
        title="江南 · 烟雨装甲"
        src="/games/jiangnan/index.html"
        className="h-full w-full border-0"
        allow="gamepad"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default JiangnanGameApp;
