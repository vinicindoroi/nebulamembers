import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatCard } from "@/components/admin/StatCard";

export const Route = createFileRoute("/admin/sales")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => { const { data } = await supabase.from("transactions").select("*").order("created_at",{ascending:false}); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const total = rows.reduce((a,r) => a + Number(r.amount), 0);
  const series = Array.from({length:30}).map((_,i) => {
    const day = new Date(Date.now() - (29-i)*86400000);
    const v = rows.filter((r) => new Date(r.created_at).toDateString()===day.toDateString()).reduce((a,r)=>a+Number(r.amount),0);
    return { d: day.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}), v };
  });
  const refund = async (id:string) => { if(!confirm("Reembolsar?")) return; await supabase.from("transactions").update({status:"refunded"}).eq("id",id); toast.success("Reembolsado"); load(); };
  const seed = async () => {
    const plans=["Pro","Premium","Free"];
    await supabase.from("transactions").insert(Array.from({length:10}).map(()=>({plan:plans[Math.floor(Math.random()*3)],amount:Math.round(Math.random()*200+29),status:"paid",method:"card"})));
    load();
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Vendas</h1><p className="text-sm text-muted-foreground">{rows.length} transações</p></div>
        <button onClick={seed} className="text-xs glass px-3 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2"><Plus className="h-3.5 w-3.5"/>Gerar exemplos</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Receita total" value={`R$ ${total.toFixed(2)}`} icon={DollarSign}/>
        <StatCard label="MRR estimado" value={`R$ ${(total/6).toFixed(2)}`} icon={DollarSign}/>
        <StatCard label="Transações" value={rows.length.toString()} icon={DollarSign}/>
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-medium mb-4">Receita (30d)</h3>
        <div className="h-56"><ResponsiveContainer><LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis dataKey="d" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false}/>
          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false}/>
          <Tooltip contentStyle={{background:"rgba(15,15,20,0.9)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12}}/>
          <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={false}/>
        </LineChart></ResponsiveContainer></div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-white/[0.02]"><tr>
            <th className="text-left px-4 py-3 font-medium">ID</th><th className="text-left px-4 py-3 font-medium">Plano</th>
            <th className="text-left px-4 py-3 font-medium">Valor</th><th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Data</th><th></th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0,8)}</td>
                <td className="px-4 py-3">{r.plan}</td>
                <td className="px-4 py-3">R$ {Number(r.amount).toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${r.status==="paid"?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">{r.status==="paid" && <button onClick={()=>refund(r.id)} className="text-xs text-red-400 hover:underline">Reembolsar</button>}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">Sem transações.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
