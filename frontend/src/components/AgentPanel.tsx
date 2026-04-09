import React from "react";

export default function AgentPanel() {
    return (
        <aside className="w-80 flex flex-col m-4 ml-0 gap-4 relative z-10 transition-all">
            {/* Active Agent Banner */}
            <div className="glass-panel p-4 flex items-center gap-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/30">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 p-0.5 shadow-md shadow-indigo-300 animate-float">
                        <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center text-xl">
                            🦉
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-700 leading-tight">Lumo Guide</h3>
                    <p className="text-xs text-indigo-600 font-medium">Lesson Designer</p>
                </div>
            </div>

            {/* Chat / Interaction Feed */}
            <div className="glass flex-1 rounded-3xl p-5 flex flex-col gap-4 overflow-y-auto">
                {/* System / Agent Message */}
                <div className="bg-white/70 rounded-2xl rounded-tl-none p-4 shadow-sm border border-white block max-w-[90%]">
                    <p className="text-sm text-slate-700">
                        Hi Alex! I made this lesson about fractions just for you. Take your time!
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block">10:02 AM</span>
                </div>

                {/* Another Agent (e.g. Attention) */}
                <div className="bg-amber-50/80 rounded-2xl rounded-tl-none p-4 shadow-sm border border-amber-100 max-w-[90%] mt-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">⚡️</span>
                        <span className="text-xs font-bold text-amber-600">Focus Coach</span>
                    </div>
                    <p className="text-sm text-slate-700">
                        You've been studying for 20 minutes with great focus! Don't forget to blink and stretch.
                    </p>
                </div>

                <div className="mt-auto"></div>
            </div>

            {/* Input Area */}
            <div className="glass-panel p-3 flex items-center gap-2 bg-white/50">
                <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                    🎤
                </button>
                <input
                    type="text"
                    placeholder="Ask Lumo why..."
                    className="flex-1 bg-white/60 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700"
                />
                <button className="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white shadow-md transition-colors">
                    ↑
                </button>
            </div>
        </aside>
    );
}
