import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface TrackingEvent {
  t: string; // tracking token
  n: string; // node_id
  e: string; // event_type
  s?: string; // session_id
  v?: string; // visitor_id
  u?: string; // page_url
  r?: string; // referrer
  m?: Record<string, unknown>; // metadata
}

function parseUserAgent(ua: string): { device_type: string; browser: string } {
  let device_type = "desktop";
  let browser = "unknown";

  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    device_type = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";
  else if (/Opera|OPR/i.test(ua)) browser = "Opera";

  return { device_type, browser };
}

function extractUtmParams(url: string): Record<string, string | null> {
  try {
    const urlObj = new URL(url);
    return {
      utm_source: urlObj.searchParams.get("utm_source"),
      utm_medium: urlObj.searchParams.get("utm_medium"),
      utm_campaign: urlObj.searchParams.get("utm_campaign"),
      utm_content: urlObj.searchParams.get("utm_content"),
      utm_term: urlObj.searchParams.get("utm_term"),
      fbclid: urlObj.searchParams.get("fbclid"),
      ttclid: urlObj.searchParams.get("ttclid"),
      gclid: urlObj.searchParams.get("gclid"),
    };
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle script.js request - serve the tracking script
  const url = new URL(req.url);
  if (url.pathname.endsWith("/script.js")) {
    const baseUrl = Deno.env.get("SUPABASE_URL") || "";
    const trackingScript = `
(function(w,d){
  var q=w._ft=w._ft||[];
  var config={};
  var visitorId=localStorage.getItem('_ft_vid');
  if(!visitorId){visitorId='v_'+Math.random().toString(36).substr(2,16);localStorage.setItem('_ft_vid',visitorId);}
  var sessionId=sessionStorage.getItem('_ft_sid');
  if(!sessionId){sessionId='s_'+Math.random().toString(36).substr(2,16);sessionStorage.setItem('_ft_sid',sessionId);}

  function send(eventType,nodeId,meta){
    var data={t:config.token,n:nodeId||config.node,e:eventType,s:sessionId,v:visitorId,u:location.href,r:document.referrer,m:meta||{}};
    navigator.sendBeacon?navigator.sendBeacon('${baseUrl}/functions/v1/funnel-tracker',JSON.stringify(data)):
    fetch('${baseUrl}/functions/v1/funnel-tracker',{method:'POST',body:JSON.stringify(data),keepalive:true});
  }

  var quizStep=0;
  var quizObserver=null;
  var lastContentHash='';

  function hashContent(el){
    var t=(el.innerText||'').slice(0,500);
    return t.length+':'+t.slice(0,50)+t.slice(-50);
  }

  function startQuizAutoDetect(){
    if(quizObserver)return;
    var target=d.querySelector('[data-quiz]')||d.querySelector('form')||d.querySelector('main')||d.body;
    lastContentHash=hashContent(target);
    quizStep=1;
    send('quiz_step',config.node,{step:quizStep,label:'Etapa '+quizStep,auto:true});

    var debounce=null;
    quizObserver=new MutationObserver(function(){
      clearTimeout(debounce);
      debounce=setTimeout(function(){
        var newHash=hashContent(target);
        if(newHash!==lastContentHash){
          var oldLen=parseInt(lastContentHash.split(':')[0])||0;
          var newLen=parseInt(newHash.split(':')[0])||0;
          var diff=Math.abs(newLen-oldLen);
          if(diff>100||diff/Math.max(oldLen,1)>0.2){
            lastContentHash=newHash;
            quizStep++;
            send('quiz_step',config.node,{step:quizStep,label:'Etapa '+quizStep,auto:true});
          }
        }
      },300);
    });
    quizObserver.observe(target,{childList:true,subtree:true,characterData:true});
  }

  q.push=function(args){
    var cmd=args[0],opts=args[1]||{};
    if(cmd==='init'){
      config=opts;
      if(config.node)send('pageview',config.node);
      if(config.quiz===true||config.quiz==='auto'){startQuizAutoDetect();}
    }
    else if(cmd==='track'){send(opts.event||'custom',opts.node,opts.meta);}
    else if(cmd==='pageview'){send('pageview',opts.node);}
    else if(cmd==='quiz_step'){var step=opts.step||1;send('quiz_step',opts.node||config.node,{step:step,answer:opts.answer||null,total_steps:opts.total_steps||null,question:opts.question||null,label:opts.label||null});}
    else if(cmd==='quiz_auto'){startQuizAutoDetect();}
  };

  for(var i=0;i<q.length;i++){if(Array.isArray(q[i]))q.push(q[i]);}

  d.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');
    if(a&&config.trackClicks!==false){
      send('click',config.node,{href:a.href,text:(a.innerText||'').slice(0,100)});
    }
  });

  setInterval(function(){
    if(config.node){send('heartbeat',config.node);}
  },30000);
})(window,document);
`;
    return new Response(trackingScript, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Handle event tracking POST requests
  if (req.method === "POST") {
    try {
      const event: TrackingEvent = await req.json();

      if (!event.t || !event.n || !event.e) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Find funnel by tracking token
      const { data: funnel, error: funnelError } = await supabase
        .from("funnels")
        .select("id")
        .eq("tracking_token", event.t)
        .single();

      if (funnelError || !funnel) {
        return new Response(JSON.stringify({ error: "Invalid tracking token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse user agent
      const userAgent = req.headers.get("user-agent") || "";
      const { device_type, browser } = parseUserAgent(userAgent);

      // Extract UTM params from page URL
      const utmParams = event.u ? extractUtmParams(event.u) : {};

      // Get IP
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                 req.headers.get("cf-connecting-ip") || null;

      // Insert event
      const { error: insertError } = await supabase.from("funnel_events").insert({
        funnel_id: funnel.id,
        node_id: event.n,
        event_type: event.e,
        session_id: event.s || null,
        visitor_id: event.v || null,
        page_url: event.u || null,
        referrer: event.r || null,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_content: utmParams.utm_content || null,
        utm_term: utmParams.utm_term || null,
        fbclid: utmParams.fbclid || null,
        ttclid: utmParams.ttclid || null,
        gclid: utmParams.gclid || null,
        device_type,
        browser,
        ip_address: ip,
        metadata: event.m || {},
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save event" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing event:", error);
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
