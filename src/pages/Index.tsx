import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

interface Quote {
  sym: string;
  name: string;
  price: number;
  price_usd?: number;
  currency: string;
  suffix?: string;
  change: number;
  up: boolean;
  category: string;
}

const FALLBACK_TICKERS = [
  { sym: "SBER", name: "Сбербанк", price: "312.40", change: "+2.14%", up: true },
  { sym: "GAZP", name: "Газпром", price: "166.18", change: "-0.87%", up: false },
  { sym: "BTC", name: "Bitcoin", price: "₽5,845,520", change: "+4.21%", up: true },
  { sym: "ETH", name: "Ethereum", price: "₽296,760", change: "+1.95%", up: true },
  { sym: "XAU", name: "Золото", price: "$2,318/oz", change: "+0.42%", up: true },
  { sym: "USD", name: "Доллар США", price: "92.34 ₽", change: "-0.15%", up: false },
  { sym: "EUR", name: "Евро", price: "99.12 ₽", change: "+0.08%", up: true },
  { sym: "CNY", name: "Юань", price: "12.68 ₽", change: "-0.22%", up: false },
  { sym: "LKOH", name: "Лукойл", price: "5,443.50", change: "+0.06%", up: true },
];

function formatPrice(q: Quote): string {
  const p = q.price;
  if (q.category === "crypto") return `${q.currency}${p.toLocaleString("ru-RU")}`;
  if (q.category === "metals") return `${q.currency}${p.toLocaleString("en-US")}${q.suffix || ""}`;
  if (q.category === "currency") return `${p.toFixed(2)} ₽`;
  return `${p.toLocaleString("ru-RU")} ${q.currency}`;
}

function formatChange(change: number): string {
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

const NAV_ITEMS = [
  { icon: "LayoutDashboard", label: "Дашборд", id: "dashboard" },
  { icon: "TrendingUp", label: "Торговля", id: "trading" },
  { icon: "ShoppingBag", label: "Маркетплейсы", id: "marketplace" },
  { icon: "FileText", label: "ЕИС / Закупки", id: "procurement" },
  { icon: "CreditCard", label: "Счета", id: "accounts" },
  { icon: "GraduationCap", label: "Бизнес-хаб", id: "hub" },
  { icon: "Users", label: "Деловая сеть", id: "network" },
];

const CHART_DATA = [42, 58, 51, 67, 74, 63, 80, 88, 76, 92, 85, 97];

function MiniChart({ data, color = "gold" }: { data: number[]; color?: "gold" | "green" | "red" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80, h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  const cls = color === "green" ? "sparkline-green" : color === "red" ? "sparkline-red" : "sparkline";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} className={cls} />
    </svg>
  );
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="chart-bar w-full"
            style={{ height: `${(v / max) * 100}%`, opacity: i === data.length - 1 ? 1 : 0.55 }}
          />
          <span className="text-[9px] text-white/30 font-mono-num">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Index() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [liveQuotes, setLiveQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch(func2url["get-quotes"]);
      const data = await res.json();
      if (data.quotes && data.quotes.length > 0) {
        setLiveQuotes(data.quotes);
        setLastUpdate(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
        setPriceHistory(prev => {
          const updated = { ...prev };
          data.quotes.forEach((q: Quote) => {
            const history = updated[q.sym] || [];
            updated[q.sym] = [...history.slice(-11), q.price];
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Quotes fetch error:", e);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [activeSection]);

  const tickerData = liveQuotes.length > 0
    ? liveQuotes.map(q => ({
        sym: q.sym,
        name: q.name,
        price: formatPrice(q),
        change: formatChange(q.change),
        up: q.up,
      }))
    : FALLBACK_TICKERS;

  const tickerItems = [...tickerData, ...tickerData];

  const stockQuotes = liveQuotes.filter(q => q.category === "stocks");
  const cryptoQuotes = liveQuotes.filter(q => q.category === "crypto");
  const currencyQuotes = liveQuotes.filter(q => q.category === "currency");
  const metalQuotes = liveQuotes.filter(q => q.category === "metals");
  const allTradingQuotes = [...stockQuotes, ...cryptoQuotes, ...metalQuotes, ...currencyQuotes];

  return (
    <div className="min-h-screen bg-[#0A0D14] grid-line-bg text-white flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>

      {/* TOP NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-6 nav-glow"
        style={{ background: "rgba(10,13,20,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(245,183,49,0.1)" }}>
        <div className="flex items-center gap-2 mr-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)" }}>
            <span className="text-[#0A0D14] font-black text-sm">М</span>
          </div>
          <span className="font-black text-lg tracking-tight gold-gradient">М БАНК</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeSection === item.id
                ? "bg-[#F5B731]/10 text-[#F5B731] border border-[#F5B731]/20"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: liveQuotes.length > 0 ? "rgba(16,185,129,0.1)" : "rgba(245,183,49,0.1)", border: `1px solid ${liveQuotes.length > 0 ? "rgba(16,185,129,0.2)" : "rgba(245,183,49,0.2)"}` }}>
            <div className={liveQuotes.length > 0 ? "pulse-dot" : "pulse-dot"} style={liveQuotes.length === 0 ? { background: "#F5B731", boxShadow: "0 0 0 0 rgba(245,183,49,0.5)" } : {}} />
            <span className={`text-xs font-medium ${liveQuotes.length > 0 ? "text-emerald-400" : "text-[#F5B731]"}`}>
              {quotesLoading ? "Загрузка..." : liveQuotes.length > 0 ? `Live · ${lastUpdate}` : "Оффлайн"}
            </span>
          </div>
          <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(245,183,49,0.1)", border: "1px solid rgba(245,183,49,0.2)" }}>
            <Icon name="Bell" size={16} className="text-[#F5B731]" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)", color: "#0A0D14" }}>
            АИ
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Icon name="Menu" size={20} className="text-white/60" />
          </button>
        </div>
      </header>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 p-4 flex flex-col gap-1"
            style={{ background: "#0D1018", borderRight: "1px solid rgba(245,183,49,0.1)" }}
            onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(item => (
              <button key={item.id}
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === item.id
                  ? "bg-[#F5B731]/10 text-[#F5B731]" : "text-white/50 hover:text-white/70"}`}>
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TICKER */}
      <div className="fixed top-14 left-0 right-0 z-40 h-9 flex items-center ticker-wrap"
        style={{ background: "rgba(10,13,20,0.95)", borderBottom: "1px solid rgba(245,183,49,0.08)" }}>
        <div className="ticker-inner">
          {tickerItems.map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-5 border-r border-white/5">
              <span className="text-white/30 text-xs font-mono-num font-semibold">{t.sym}</span>
              <span className="text-white/80 text-xs font-mono-num">{t.price}</span>
              <span className={`text-xs font-mono-num font-semibold ${t.up ? "ticker-up" : "ticker-down"}`}>{t.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 pt-[92px] pb-24 lg:pb-8 px-4 md:px-6 max-w-[1400px] mx-auto w-full">

        {/* ===== DASHBOARD ===== */}
        {activeSection === "dashboard" && (
          <div key={`dash-${animKey}`} className="animate-slide-up space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Финансовый дашборд</h1>
                <p className="text-white/40 text-sm mt-0.5">{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · Москва{lastUpdate ? ` · обновлено ${lastUpdate}` : ""}</p>
              </div>
              <button className="btn-gold px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <Icon name="Download" size={14} />
                Отчёт
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Активы портфеля", val: "₽ 12,847,320", delta: "+18.4%", up: true, icon: "Wallet", spark: [55,60,52,68,75,70,85,80,92,88,95,100] },
                { label: "Доход за месяц", val: "₽ 842,500", delta: "+7.2%", up: true, icon: "TrendingUp", spark: [40,48,55,45,62,70,65,78,72,85,80,88] },
                { label: "Открытые сделки", val: "23", delta: "+3 сегодня", up: true, icon: "Activity", spark: [10,14,12,18,15,20,22,19,25,23,21,24] },
                { label: "Госзакупки (ЕИС)", val: "7 лотов", delta: "2 активных", up: true, icon: "FileText", spark: [3,4,3,5,6,5,7,6,8,7,8,7] },
              ].map((kpi, i) => (
                <div key={i} className={`card-glass card-glass-hover rounded-2xl p-4 animate-slide-up delay-${(i+1)*100}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,183,49,0.1)" }}>
                      <Icon name={kpi.icon} size={18} className="text-[#F5B731]" />
                    </div>
                    <MiniChart data={kpi.spark} color={kpi.up ? "green" : "red"} />
                  </div>
                  <div className="font-mono-num font-bold text-xl text-white">{kpi.val}</div>
                  <div className="text-white/40 text-xs mt-0.5">{kpi.label}</div>
                  <div className={`text-xs mt-1 font-semibold ${kpi.up ? "ticker-up" : "ticker-down"}`}>{kpi.delta}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 card-glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-base">Динамика портфеля</div>
                    <div className="text-white/40 text-xs">Последние 12 месяцев</div>
                  </div>
                  <div className="flex gap-1">
                    {["1М", "3М", "6М", "1Г"].map((p, i) => (
                      <button key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${i === 3 ? "bg-[#F5B731]/15 text-[#F5B731] border border-[#F5B731]/20" : "text-white/40 hover:text-white/60"}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <BarChart data={CHART_DATA} />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <div className="text-white/40 text-xs">Доходность за год</div>
                  <div className="font-mono-num font-bold text-[#10B981]">+34.7%</div>
                </div>
              </div>

              <div className="card-glass rounded-2xl p-5">
                <div className="font-bold text-base mb-4">Распределение активов</div>
                <div className="space-y-3">
                  {[
                    { label: "Акции РФ", pct: 42, color: "#F5B731", val: "₽5.4М" },
                    { label: "Криптовалюты", pct: 28, color: "#3B82F6", val: "₽3.6М" },
                    { label: "Металлы", pct: 18, color: "#10B981", val: "₽2.3М" },
                    { label: "Валюта", pct: 12, color: "#8B5CF6", val: "₽1.5М" },
                  ].map((a, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                          <span className="text-white/60">{a.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">{a.val}</span>
                          <span className="font-mono-num font-semibold text-white/80">{a.pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${a.pct}%`, background: a.color, boxShadow: `0 0 8px ${a.color}50` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="font-mono-num font-bold text-lg text-[#F5B731]">₽12.8М</div>
                    <div className="text-white/40 text-xs">Итого</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono-num font-bold text-lg text-[#10B981]">+18.4%</div>
                    <div className="text-white/40 text-xs">Рост</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="Shield" size={18} className="text-[#F5B731]" />
                <div className="font-bold text-base">Программы государственной поддержки</div>
                <div className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold stat-badge">3 доступных</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Льготное кредитование МСП", rate: "от 3%", sum: "до ₽500М", deadline: "до 01.06.2026", icon: "Building2", badge: "Горячее" },
                  { title: "Субсидии на экспорт", rate: "до 70%", sum: "компенсация затрат", deadline: "до 15.05.2026", icon: "Globe", badge: "Новое" },
                  { title: "Цифровизация бизнеса", rate: "50%", sum: "возврат за ПО", deadline: "постоянно", icon: "Cpu", badge: "Активно" },
                ].map((p, i) => (
                  <div key={i} className="rounded-xl p-4 hover:bg-white/5 transition-colors cursor-pointer group"
                    style={{ background: "rgba(245,183,49,0.04)", border: "1px solid rgba(245,183,49,0.1)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,183,49,0.12)" }}>
                        <Icon name={p.icon} size={16} className="text-[#F5B731]" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full stat-badge">{p.badge}</span>
                    </div>
                    <div className="font-semibold text-sm text-white/90 mb-1">{p.title}</div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-num text-[#F5B731] font-bold text-base">{p.rate}</span>
                      <span className="text-white/40 text-xs">· {p.sum}</span>
                    </div>
                    <div className="text-xs text-white/30">Срок подачи: {p.deadline}</div>
                    <button className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 btn-gold">Подать заявку</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-base">Последние операции</div>
                <button className="text-[#F5B731] text-xs hover:underline">Все операции</button>
              </div>
              <div className="space-y-2">
                {[
                  { type: "buy", asset: "SBER", qty: "500 акций", sum: "+₽156,200", time: "10:32", color: "#10B981" },
                  { type: "sell", asset: "BTC", qty: "0.15 BTC", sum: "-₽952,200", time: "09:18", color: "#EF4444" },
                  { type: "transfer", asset: "Перевод USD → RUB", qty: "$50,000", sum: "4,617,000 ₽", time: "08:55", color: "#3B82F6" },
                  { type: "buy", asset: "XAU (Золото)", qty: "5 oz", sum: "+₽539,000", time: "Вчера", color: "#10B981" },
                  { type: "gov", asset: "Заявка ЕИС №2024-845", qty: "Госзакупка", sum: "₽12,500,000", time: "Вчера", color: "#F5B731" },
                ].map((op, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${op.color}18`, border: `1px solid ${op.color}30` }}>
                      <Icon name={op.type === "buy" ? "ArrowDownLeft" : op.type === "sell" ? "ArrowUpRight" : op.type === "gov" ? "FileText" : "ArrowLeftRight"} size={14}
                        style={{ color: op.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white/90 truncate">{op.asset}</div>
                      <div className="text-xs text-white/40">{op.qty}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num font-semibold text-sm" style={{ color: op.color }}>{op.sum}</div>
                      <div className="text-xs text-white/30">{op.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== TRADING ===== */}
        {activeSection === "trading" && (
          <div key={`trading-${animKey}`} className="animate-slide-up space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Торговая платформа</h1>
                <p className="text-white/40 text-sm mt-0.5">Акции · Металлы · Крипто · Валюта</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>Купить</button>
                <button className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>Продать</button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Все", "Акции", "Металлы", "Криптовалюты", "Валюта", "Облигации"].map((cat, i) => (
                <button key={i} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${i === 0
                  ? "bg-[#F5B731]/15 text-[#F5B731] border border-[#F5B731]/25"
                  : "text-white/40 hover:text-white/70 card-glass"}`}>{cat}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 card-glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <div className="grid grid-cols-4 text-xs text-white/30 font-medium uppercase tracking-wider">
                    <span>Инструмент</span>
                    <span className="text-right">Цена</span>
                    <span className="text-right">Изменение</span>
                    <span className="text-right">График</span>
                  </div>
                </div>
                {(allTradingQuotes.length > 0 ? allTradingQuotes : [
                  { sym: "SBER", name: "Сбербанк", price: 312.40, currency: "₽", change: 2.14, up: true, category: "stocks" },
                  { sym: "GAZP", name: "Газпром", price: 166.18, currency: "₽", change: -0.87, up: false, category: "stocks" },
                  { sym: "BTC", name: "Bitcoin", price: 5845520, currency: "₽", change: 4.21, up: true, category: "crypto" },
                ] as Quote[]).map((ins, i) => (
                  <div key={i} className="grid grid-cols-4 items-center px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: "rgba(245,183,49,0.1)", color: "#F5B731" }}>{ins.sym.slice(0, 2)}</div>
                      <div>
                        <div className="font-semibold text-sm text-white/90">{ins.sym}</div>
                        <div className="text-xs text-white/35">{ins.name}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono-num font-semibold text-sm text-white/90">{formatPrice(ins)}</div>
                    <div className={`text-right font-mono-num font-bold text-sm ${ins.up ? "ticker-up" : "ticker-down"}`}>{formatChange(ins.change)}</div>
                    <div className="flex justify-end">
                      <MiniChart data={priceHistory[ins.sym] || [ins.price * 0.98, ins.price * 0.99, ins.price * 1.01, ins.price * 0.995, ins.price * 1.005, ins.price * 1.01, ins.price]} color={ins.up ? "green" : "red"} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-base mb-4">Быстрая сделка</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Инструмент</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span className="text-[#F5B731] font-semibold text-sm">{stockQuotes[0]?.sym || "SBER"}</span>
                        <span className="text-white/40 text-sm">· {stockQuotes[0]?.name || "Сбербанк"}</span>
                        <Icon name="ChevronDown" size={14} className="ml-auto text-white/30" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Количество (лотов)</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <input type="number" defaultValue="100" className="bg-transparent text-white font-mono-num font-semibold text-sm w-full outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Тип ордера</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Рыночный", "Лимитный"].map((t, i) => (
                          <button key={i} className={`py-2 rounded-xl text-xs font-semibold transition-all ${i === 0 ? "bg-[#F5B731]/15 text-[#F5B731] border border-[#F5B731]/25" : "text-white/40 hover:text-white/60 card-glass"}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="pt-1 border-t border-white/5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/40">Ориентировочная сумма</span>
                        <span className="font-mono-num font-bold text-white/90">₽{((stockQuotes[0]?.price || 312) * 100).toLocaleString("ru-RU")}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Комиссия</span>
                        <span className="font-mono-num text-white/60">₽{Math.round((stockQuotes[0]?.price || 312) * 100 * 0.001).toLocaleString("ru-RU")}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button className="py-2.5 rounded-xl font-bold text-sm" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>Купить</button>
                      <button className="py-2.5 rounded-xl font-bold text-sm" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>Продать</button>
                    </div>
                  </div>
                </div>

                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Icon name="ArrowLeftRight" size={14} className="text-[#F5B731]" />
                    Обмен валюты
                  </div>
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="text-white/50 text-xs">Отдаю</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num font-bold">10,000</span>
                        <span className="text-[#F5B731] text-xs font-semibold">USD</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(245,183,49,0.15)" }}>
                        <Icon name="ArrowDownUp" size={12} className="text-[#F5B731]" />
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="text-white/50 text-xs">Получаю</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num font-bold text-[#10B981]">{(10000 * (currencyQuotes.find(q => q.sym === "USD")?.price || 92.34)).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}</span>
                        <span className="text-[#10B981] text-xs font-semibold">RUB</span>
                      </div>
                    </div>
                    <button className="btn-gold w-full py-2 rounded-xl text-sm font-bold mt-1">Обменять</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== MARKETPLACE ===== */}
        {activeSection === "marketplace" && (
          <div key={`mp-${animKey}`} className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Интеграция с маркетплейсами</h1>
              <p className="text-white/40 text-sm mt-0.5">Управляйте продажами на всех площадках из одного окна</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Wildberries", sales: "₽2,340,000", orders: 847, delta: "+12.4%", color: "#8B5CF6", connected: true },
                { name: "Ozon", sales: "₽1,180,000", orders: 412, delta: "+8.7%", color: "#005BFF", connected: true },
                { name: "Яндекс Маркет", sales: "₽670,000", orders: 231, delta: "+5.2%", color: "#FFCC00", connected: true },
                { name: "Lamoda", sales: "—", orders: 0, delta: "Не подключён", color: "#FF4F4F", connected: false },
              ].map((mp, i) => (
                <div key={i} className="card-glass card-glass-hover rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
                      style={{ background: `${mp.color}20`, color: mp.color }}>{mp.name[0]}</div>
                    <div className={`w-2 h-2 rounded-full ${mp.connected ? "bg-emerald-400" : "bg-white/20"}`}
                      style={mp.connected ? { boxShadow: "0 0 6px #10B981" } : {}} />
                  </div>
                  <div className="font-bold text-sm text-white/90">{mp.name}</div>
                  <div className="font-mono-num font-black text-xl mt-1">{mp.sales}</div>
                  {mp.connected ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-white/40 text-xs">{mp.orders} заказов</span>
                      <span className="ticker-up text-xs font-bold">{mp.delta}</span>
                    </div>
                  ) : (
                    <button className="mt-2 w-full py-1.5 rounded-lg text-xs btn-gold">Подключить</button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-glass rounded-2xl p-5">
                <div className="font-bold text-base mb-4">Топ товаров по продажам</div>
                <div className="space-y-3">
                  {[
                    { name: "Смартфон Xiaomi 14", sku: "SKU-8821", sales: 243, revenue: "₽486,000", trend: "+18%" },
                    { name: "Наушники TWS Pro", sku: "SKU-4412", sales: 187, revenue: "₽280,500", trend: "+9%" },
                    { name: "Ноутбук Lenovo IdeaPad", sku: "SKU-2207", sales: 98, revenue: "₽588,000", trend: "+22%" },
                    { name: "Зарядное USB-C 65W", sku: "SKU-9934", sales: 412, revenue: "₽123,600", trend: "+5%" },
                  ].map((prod, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-[#0A0D14]"
                        style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)" }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white/90 truncate">{prod.name}</div>
                        <div className="text-xs text-white/35">{prod.sku} · {prod.sales} шт.</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-num font-bold text-sm text-white/90">{prod.revenue}</div>
                        <div className="ticker-up text-xs font-semibold">{prod.trend}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-glass rounded-2xl p-5">
                <div className="font-bold text-base mb-4">Статус заказов</div>
                <div className="space-y-3">
                  {[
                    { status: "Новые", count: 47, color: "#3B82F6", pct: 30 },
                    { status: "В обработке", count: 83, color: "#F5B731", pct: 52 },
                    { status: "Отправлены", count: 128, color: "#10B981", pct: 80 },
                    { status: "Отменены", count: 12, color: "#EF4444", pct: 8 },
                  ].map((s, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-white/70">{s.status}</span>
                        </div>
                        <span className="font-mono-num font-bold text-white/90">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Всего заказов сегодня</span>
                    <span className="font-mono-num font-bold text-[#F5B731]">270</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PROCUREMENT ===== */}
        {activeSection === "procurement" && (
          <div key={`proc-${animKey}`} className="animate-slide-up space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Государственные закупки · ЕИС</h1>
                <p className="text-white/40 text-sm mt-0.5">Электронная подпись · 44-ФЗ · 223-ФЗ</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Icon name="ShieldCheck" size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">КЭП активна</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Активных заявок", val: "7", icon: "FileText", color: "#F5B731" },
                { label: "Выиграно тендеров", val: "23", icon: "Trophy", color: "#10B981" },
                { label: "Сумма контрактов", val: "₽84.5М", icon: "Banknote", color: "#3B82F6" },
                { label: "На рассмотрении", val: "3", icon: "Clock", color: "#F59E0B" },
              ].map((stat, i) => (
                <div key={i} className="card-glass card-glass-hover rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${stat.color}18` }}>
                    <Icon name={stat.icon} size={20} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="font-mono-num font-black text-xl" style={{ color: stat.color }}>{stat.val}</div>
                    <div className="text-white/40 text-xs">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="font-bold text-base">Актуальные тендеры</div>
                <button className="btn-gold px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Icon name="Search" size={12} />
                  Найти тендеры
                </button>
              </div>
              {[
                { num: "0173200002824000023", title: "Поставка серверного оборудования", org: "Минцифры России", sum: "₽12,500,000", deadline: "20.04.2026", status: "Участвую", statusColor: "#F5B731" },
                { num: "0372200062824000089", title: "ИТ-сопровождение информационных систем", org: "ФНС России", sum: "₽8,200,000", deadline: "25.04.2026", status: "Подаю заявку", statusColor: "#3B82F6" },
                { num: "0148300019824000045", title: "Разработка мобильного приложения", org: "ДИТ Москвы", sum: "₽5,700,000", deadline: "15.05.2026", status: "Анализ", statusColor: "#8B5CF6" },
                { num: "0324200006824000112", title: "Поставка оргтехники для госучреждений", org: "Роспотребнадзор", sum: "₽2,100,000", deadline: "30.04.2026", status: "Выиграно", statusColor: "#10B981" },
              ].map((t, i) => (
                <div key={i} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white/90 mb-1">{t.title}</div>
                      <div className="text-xs text-white/40 mb-2">№ {t.num} · {t.org}</div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-white/50">
                          <Icon name="Calendar" size={11} />
                          Срок: {t.deadline}
                        </div>
                        <div className="font-mono-num font-bold text-[#F5B731]">{t.sum}</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
                      style={{ background: `${t.statusColor}15`, color: t.statusColor, border: `1px solid ${t.statusColor}30` }}>
                      {t.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="PenTool" size={16} className="text-[#F5B731]" />
                <div className="font-bold text-base">Электронная подпись (КЭП)</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Подписать документ", desc: "Загрузите файл и подпишите КЭП", icon: "FilePlus" },
                  { title: "Проверить подпись", desc: "Валидация подписи по ГОСТ", icon: "ShieldCheck" },
                  { title: "Сертификат КЭП", desc: "Действителен до 14.04.2027", icon: "Award" },
                ].map((action, i) => (
                  <button key={i} className="card-glass card-glass-hover rounded-xl p-4 text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(245,183,49,0.1)" }}>
                      <Icon name={action.icon} size={18} className="text-[#F5B731]" />
                    </div>
                    <div className="font-semibold text-sm text-white/90">{action.title}</div>
                    <div className="text-xs text-white/40 mt-1">{action.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ACCOUNTS ===== */}
        {activeSection === "accounts" && (
          <div key={`acc-${animKey}`} className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Управление счетами</h1>
              <p className="text-white/40 text-sm mt-0.5">Российские и международные · Мультивалютность</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Расчётный RUB", num: "40702 810 3 0001 0000123", bal: "₽ 4,218,340.00", flag: "🇷🇺", color: "#F5B731", isPrimary: true },
                { name: "Валютный USD", num: "40702 840 0 0001 0000087", bal: "$ 48,200.00", flag: "🇺🇸", color: "#10B981" },
                { name: "Евро счёт EUR", num: "40702 978 0 0001 0000034", bal: "€ 21,750.00", flag: "🇪🇺", color: "#3B82F6" },
                { name: "Юань CNY", num: "40702 156 0 0001 0000012", bal: "¥ 128,400.00", flag: "🇨🇳", color: "#EF4444" },
                { name: "Дирхам AED", num: "40702 784 0 0001 0000008", bal: "د.إ 18,500.00", flag: "🇦🇪", color: "#8B5CF6" },
                { name: "Открыть счёт", num: "", bal: "", flag: "➕", color: "#F5B731", isNew: true },
              ].map((acc, i) => (
                <div key={i} className={`card-glass rounded-2xl p-5 transition-all duration-200 ${acc.isNew ? "opacity-50 hover:opacity-80 cursor-pointer" : "card-glass-hover cursor-pointer"}`}
                  style={{ border: acc.isPrimary ? "1px solid rgba(245,183,49,0.3)" : acc.isNew ? "1px dashed rgba(255,255,255,0.15)" : undefined }}>
                  {acc.isNew ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <div className="text-3xl">➕</div>
                      <div className="font-semibold text-white/60">Открыть новый счёт</div>
                      <div className="text-xs text-white/30">Мультивалютный · Международный</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{acc.flag}</span>
                          <div>
                            <div className="font-semibold text-sm text-white/90">{acc.name}</div>
                            {acc.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded-full stat-badge">Основной</span>}
                          </div>
                        </div>
                        <Icon name="MoreHorizontal" size={16} className="text-white/30" />
                      </div>
                      <div className="font-mono-num font-black text-2xl mb-1" style={{ color: acc.color }}>{acc.bal}</div>
                      <div className="text-xs text-white/30 font-mono-num">{acc.num}</div>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: `${acc.color}15`, color: acc.color, border: `1px solid ${acc.color}25` }}>Перевести</button>
                        <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white/70 card-glass">История</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="card-glass rounded-2xl p-5">
              <div className="font-bold text-base mb-4 flex items-center gap-2">
                <Icon name="Send" size={16} className="text-[#F5B731]" />
                Быстрый перевод
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Со счёта</label>
                  <div className="px-3 py-2.5 rounded-xl text-sm flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white/80">🇷🇺 RUB · Основной</span>
                    <Icon name="ChevronDown" size={14} className="text-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Получатель / Счёт</label>
                  <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input placeholder="БИК, номер счёта или ИНН" className="bg-transparent text-white/80 w-full outline-none text-sm placeholder:text-white/25" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Сумма</label>
                  <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input type="number" placeholder="0.00" className="bg-transparent text-white font-mono-num font-semibold w-full outline-none placeholder:text-white/25" />
                    <span className="text-[#F5B731] text-xs font-semibold">₽</span>
                  </div>
                </div>
                <button className="btn-gold py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Icon name="Send" size={14} />
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HUB ===== */}
        {activeSection === "hub" && (
          <div key={`hub-${animKey}`} className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Бизнес-хаб</h1>
              <p className="text-white/40 text-sm mt-0.5">Программы поддержки · Наставники · База знаний · Обучение</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-base mb-4 flex items-center gap-2">
                    <Icon name="Rocket" size={16} className="text-[#F5B731]" />
                    Бизнес-программы
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: "Акселератор экспортёров", org: "РЭЦ", stage: "Набор до 30 апреля", participants: 48, color: "#10B981" },
                      { title: "Финансовый буст для МСП", org: "Корпорация МСП", stage: "Идёт обучение", participants: 120, color: "#3B82F6" },
                      { title: "Цифровой бизнес 2026", org: "Сколково", stage: "Регистрация открыта", participants: 87, color: "#F5B731" },
                      { title: "Менторинг от топ-менеджеров", org: "М Банк", stage: "3 места осталось", participants: 12, color: "#8B5CF6" },
                    ].map((prog, i) => (
                      <div key={i} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-2 h-10 rounded-full shrink-0" style={{ background: prog.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-white/90">{prog.title}</div>
                          <div className="text-xs text-white/40">{prog.org} · {prog.stage}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono-num font-bold text-sm text-white/70">{prog.participants}</div>
                          <div className="text-xs text-white/30">участников</div>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-gold shrink-0">Участвовать</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-base mb-4 flex items-center gap-2">
                    <Icon name="BookOpen" size={16} className="text-[#F5B731]" />
                    База знаний
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: "Как выйти на экспорт", reads: "2.4K", icon: "Globe" },
                      { title: "Торговля на бирже: старт", reads: "5.1K", icon: "TrendingUp" },
                      { title: "Участие в госзакупках", reads: "3.8K", icon: "FileText" },
                      { title: "Финансовое планирование", reads: "1.9K", icon: "Calculator" },
                    ].map((art, i) => (
                      <div key={i} className="rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Icon name={art.icon} size={16} className="text-[#F5B731] mb-2" />
                        <div className="font-semibold text-sm text-white/80 mb-1">{art.title}</div>
                        <div className="text-xs text-white/30">{art.reads} прочтений</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-base mb-4 flex items-center gap-2">
                    <Icon name="Star" size={16} className="text-[#F5B731]" />
                    Наставники
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Алексей Воронов", spec: "Финансы · ВЭД", sessions: 142, rating: "4.9" },
                      { name: "Мария Соколова", spec: "Маркетплейсы", sessions: 89, rating: "5.0" },
                      { name: "Дмитрий Нечаев", spec: "Госзакупки · 44-ФЗ", sessions: 211, rating: "4.8" },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)", color: "#0A0D14" }}>
                          {m.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-white/90">{m.name}</div>
                          <div className="text-xs text-white/40">{m.spec}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs">
                            <Icon name="Star" size={10} className="text-[#F5B731]" />
                            <span className="font-bold text-[#F5B731]">{m.rating}</span>
                          </div>
                          <div className="text-xs text-white/30">{m.sessions} сессий</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-gold w-full py-2 rounded-xl text-sm font-bold mt-3">Найти наставника</button>
                </div>

                <div className="card-glass rounded-2xl p-5">
                  <div className="font-bold text-sm mb-3">Ближайшие вебинары</div>
                  {[
                    { title: "Экспорт в Китай 2026", date: "17 апр", time: "14:00" },
                    { title: "Автоматизация маркетплейсов", date: "22 апр", time: "11:00" },
                    { title: "Биржевая торговля: мастер-класс", date: "28 апр", time: "16:00" },
                  ].map((w, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)", color: "#0A0D14" }}>
                        <span className="text-[8px] font-bold leading-none">{w.date.split(" ")[1]}</span>
                        <span className="text-xs font-black leading-none">{w.date.split(" ")[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/90 truncate">{w.title}</div>
                        <div className="text-xs text-white/35">{w.time} МСК</div>
                      </div>
                      <Icon name="ChevronRight" size={14} className="text-white/30 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== NETWORK ===== */}
        {activeSection === "network" && (
          <div key={`net-${animKey}`} className="animate-slide-up space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Деловая сеть</h1>
              <p className="text-white/40 text-sm mt-0.5">База контактов · Предприниматели · Партнёры</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Контактов в сети", val: "1,284", icon: "Users", color: "#F5B731" },
                { label: "Ваших контактов", val: "47", icon: "UserCheck", color: "#10B981" },
                { label: "Запросов", val: "8", icon: "UserPlus", color: "#3B82F6" },
                { label: "Встреч запланировано", val: "3", icon: "Calendar", color: "#8B5CF6" },
              ].map((s, i) => (
                <div key={i} className="card-glass card-glass-hover rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                    <Icon name={s.icon} size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="font-mono-num font-black text-xl" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-glass rounded-2xl p-5">
                <div className="font-bold text-base mb-4 flex items-center gap-2">
                  <Icon name="Sparkles" size={16} className="text-[#F5B731]" />
                  Рекомендуемые партнёры
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Иван Козлов", role: "CEO · Логистика", company: "TransLog Group", tags: ["ВЭД", "B2B"], mutual: 5 },
                    { name: "Анна Петрова", role: "Директор по продажам", company: "TechRetail LLC", tags: ["Маркетплейсы", "IT"], mutual: 3 },
                    { name: "Сергей Михайлов", role: "Финансовый директор", company: "BuildCapital", tags: ["Инвестиции", "МСП"], mutual: 7 },
                    { name: "Ольга Фёдорова", role: "Управляющий партнёр", company: "GreenExport", tags: ["Экспорт", "Агро"], mutual: 2 },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: "linear-gradient(135deg,#1E2535,#2A3347)", border: "1px solid rgba(245,183,49,0.2)" }}>
                        {p.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white/90">{p.name}</div>
                        <div className="text-xs text-white/40">{p.role} · {p.company}</div>
                        <div className="flex gap-1 mt-1">
                          {p.tags.map((tag: string, ti: number) => (
                            <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(245,183,49,0.1)", color: "#F5B731", border: "1px solid rgba(245,183,49,0.15)" }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-white/30 mb-1">{p.mutual} общих</div>
                        <button className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: "rgba(245,183,49,0.1)", color: "#F5B731", border: "1px solid rgba(245,183,49,0.2)" }}>
                          Добавить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-glass rounded-2xl p-5">
                <div className="font-bold text-base mb-4 flex items-center gap-2">
                  <Icon name="Rss" size={16} className="text-[#F5B731]" />
                  Лента сети
                </div>
                <div className="space-y-4">
                  {[
                    { author: "Иван К.", text: "Выиграли тендер на ₽8.2М по 44-ФЗ! Рад поделиться опытом участия в госзакупках.", time: "2 ч. назад", likes: 24 },
                    { author: "Анна П.", text: "Запустили новый магазин на Wildberries — 300+ SKU. Обращайтесь за консультацией по маркетплейсам.", time: "5 ч. назад", likes: 41 },
                    { author: "Сергей М.", text: "Программа льготного кредитования МСП — отличная возможность. Успел подать до дедлайна!", time: "1 д. назад", likes: 18 },
                  ].map((post, i) => (
                    <div key={i} className="pb-4 border-b border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "linear-gradient(135deg,#F5B731,#C8941A)", color: "#0A0D14" }}>
                          {post.author.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <span className="font-semibold text-sm text-white/90">{post.author}</span>
                        <span className="text-xs text-white/30 ml-auto">{post.time}</span>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{post.text}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="flex items-center gap-1 text-xs text-white/30 hover:text-[#F5B731] transition-colors">
                          <Icon name="Heart" size={12} />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1 text-xs text-white/30 hover:text-[#F5B731] transition-colors">
                          <Icon name="MessageCircle" size={12} />
                          Ответить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 flex"
        style={{ background: "rgba(10,13,20,0.97)", borderTop: "1px solid rgba(245,183,49,0.1)", backdropFilter: "blur(20px)" }}>
        {NAV_ITEMS.slice(0, 5).map(item => (
          <button key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all ${activeSection === item.id ? "text-[#F5B731]" : "text-white/30"}`}>
            <Icon name={item.icon} size={20} />
            <span className="text-[9px] font-medium">{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}