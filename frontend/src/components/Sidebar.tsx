import React from "react";

export default function Sidebar() {
    return (
        <aside className="w-64 glass-dark text-white rounded-3xl p-6 flex flex-col justify-between m-4 shadow-2xl relative z-10 border border-white/10 backdrop-blur-xl">
            <div>
                <div className="flex items-center gap-3 mb-10 pl-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 flex items-center justify-center font-bold text-xl shadow-lg border border-white/20">
                        L
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-blue-200">
                        LUMO
                    </h1>
                </div>

                <nav className="space-y-3">
                    <a
                        href="#"
                        className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/10 text-white font-medium transition-all hover:bg-white/15 border border-white/5 shadow-inner shadow-white/5"
                    >
                        <span className="text-xl">📚</span>
                        <span>Current Lesson</span>
                    </a>
                    <a
                        href="#"
                        className="flex items-center gap-4 px-4 py-3 rounded-2xl text-white/70 font-medium transition-all hover:bg-white/5 hover:text-white"
                    >
                        <span className="text-xl">🎯</span>
                        <span>Quizzes</span>
                    </a>
                    <a
                        href="#"
                        className="flex items-center gap-4 px-4 py-3 rounded-2xl text-white/70 font-medium transition-all hover:bg-white/5 hover:text-white"
                    >
                        <span className="text-xl">🏆</span>
                        <span>Achievements</span>
                    </a>
                </nav>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <h3 className="text-sm font-medium text-white/80 mb-2">Daily Goal</h3>
                <div className="w-full bg-black/20 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full w-[75%] relative">
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                    </div>
                </div>
                <p className="text-xs text-white/50">45 / 60 mins</p>
            </div>
        </aside>
    );
}
