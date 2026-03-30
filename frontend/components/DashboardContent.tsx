import React from "react";

export default function DashboardContent() {
    return (
        <main className="flex-1 flex flex-col m-4 ml-0 relative z-10">
            {/* Header */}
            <header className="glass-panel w-full mb-6 p-4 px-8 flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">
                        Welcome back, <span className="text-gradient">Alex!</span> 👋
                    </h2>
                    <p className="text-sm text-slate-500">Ready for your next math challenge?</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white/50 hover:bg-white text-slate-700 font-semibold py-2 px-6 rounded-full shadow-sm transition-all border border-indigo-100">
                        Pause (2m)
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-200 to-amber-400 shadow-lg border-2 border-white cursor-pointer" />
                </div>
            </header>

            {/* Main Lesson Area */}
            <div className="glass-panel flex-1 flex flex-col shadow-lg p-0 overflow-hidden bg-white/40">
                <div className="bg-indigo-50/80 p-6 border-b border-indigo-100 flex justify-between items-center">
                    <div>
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                            Unit 4
                        </span>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Introduction to Fractions</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 font-bold">✓</div>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">2</div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center font-bold">3</div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 text-slate-700 leading-relaxed text-lg space-y-6 flex flex-col justify-center items-center">

                    <div className="max-w-2xl text-center space-y-6">
                        <p className="text-2xl text-slate-800 font-medium">
                            Imagine you have a delicious pizza 🍕, and you want to share it equally with your 3 friends.
                        </p>
                        <div className="w-64 h-64 bg-white rounded-full mx-auto shadow-inner border-8 border-indigo-50 relative flex items-center justify-center overflow-hidden animate-[pulse-slow_4s_infinite]">
                            {/* Mock Pizza slices */}
                            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-200 border-l border-b border-amber-400/30 Origin-bottom-left"></div>
                            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-amber-300 border-l border-t border-amber-400/30"></div>
                            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-200 border-r border-t border-amber-400/30"></div>
                            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-indigo-400/20 backdrop-blur-sm border-r border-b border-indigo-300 flex items-center justify-center shadow-lg transition-all hover:bg-indigo-400/40 cursor-pointer">
                                <span className="text-2xl font-bold text-indigo-800">1/4</span>
                            </div>
                        </div>
                        <p className="text-xl">
                            Since there are 4 of you total, you cut the pizza into 4 equal slices. Each slice is exactly <strong>one fourth</strong> (1/4) of the pizza!
                        </p>
                    </div>

                </div>

                <div className="bg-white/60 p-6 border-t border-indigo-50 flex justify-end gap-4 mt-auto">
                    <button className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                        I don&apos;t understand 🤔
                    </button>
                    <button className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold shadow-md shadow-indigo-200 hover:-translate-y-0.5 transition-transform">
                        Take the Quiz 🚀
                    </button>
                </div>
            </div>
        </main>
    );
}
