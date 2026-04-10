import Sidebar from "@/components/Sidebar";
import DashboardContent from "@/components/DashboardContent";
import AgentPanel from "@/components/AgentPanel";

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 relative selection:bg-indigo-300 selection:text-white">
      {/* 
        The background gradient pattern is handled globally in globals.css.
        We just need to arrange the three main columns here.
      */}
      <Sidebar />
      <DashboardContent />
      <AgentPanel />
    </div>
  );
}
