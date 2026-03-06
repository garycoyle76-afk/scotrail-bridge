<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ScotRail Travel Safe Master | v22.0</title>
    <style>
        :root { 
            --sr-purple: #741e6d; --sr-gold: #C5A059; --sr-red: #D32F2F; --sr-green: #2E7D32;
            --bg: #0f0a10; --card: rgba(255, 255, 255, 0.08); --glass: rgba(116, 30, 109, 0.2);
        }
        body { 
            font-family: -apple-system, system-ui, sans-serif; 
            background: var(--bg); color: white; margin: 0; padding: 20px;
            background-image: radial-gradient(circle at top right, #2d1437, #0f0a10);
            min-height: 100vh; overflow-x: hidden; touch-action: manipulation;
        }

        /* Status & Refresh Bar */
        .status-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px; }
        .pulse-dot { width: 8px; height: 8px; background: var(--sr-green); border-radius: 50%; display: inline-block; margin-right: 5px; box-shadow: 0 0 10px var(--sr-green); transition: 0.3s; }
        .pulse-off { background: #555; box-shadow: none; }
        .btn-refresh-mini { background: var(--glass); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px 15px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer; }

        /* Journey Grid */
        .journey-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .slot {
            background: var(--card); backdrop-filter: blur(15px); border-radius: 22px; 
            padding: 15px; border: 1px solid rgba(255,255,255,0.1); height: 125px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer; position: relative; display: flex; flex-direction: column; justify-content: space-between;
        }
        .slot.occupied { border-left: 6px solid var(--sr-purple); }
        .slot.delayed { border-left-color: var(--sr-red); background: rgba(211, 47, 47, 0.15); }

        .countdown { position: absolute; top: 12px; right: 12px; font-size: 10px; color: var(--sr-gold); font-weight: 900; }
        .plat-pill { font-size: 9px; padding: 3px 8px; border-radius: 12px; font-weight: 900; width: fit-content; text-transform: uppercase; }
        .plat-predicted { background: rgba(197, 160, 89, 0.2); color: var(--sr-gold); border: 1px solid var(--sr-gold); }
        .plat-confirmed { background: rgba(46, 125, 50, 0.2); color: var(--sr-green); border: 1px solid var(--sr-green); }

        /* Overlays */
        .overlay { position: fixed; inset: 0; background: var(--bg); z-index: 2000; display: none; flex-direction: column; padding: 25px; }
        .overlay.active { display: flex; }
        .btn-close { background: white; color: black; border: none; padding: 20px; border-radius: 20px; font-weight: 900; margin-top: 15px; width: 100%; }

        #splashScreen { position: fixed; inset: 0; background: var(--bg); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    </style>
</head>
<body onload="initApp()">

    <div id="splashScreen">
        <div style="width:70px; height:70px; background:var(--sr-purple); border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:15px; font-weight:900; color:white;">SR</div>
        <div style="letter-spacing:4px; font-size:10px; font-weight:900; color:white;">TRAVEL SAFE MASTER</div>
    </div>

    <div class="status-header">
        <div style="font-size: 10px; font-weight: 700; color:white;">
            <span id="pulse" class="pulse-dot"></span> <span id="status-text">SYSTEM READY</span>
        </div>
        <button class="btn-refresh-mini" onclick="refreshAllSlots()">FORCE SYNC</button>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
        <input type="text" id="origin" placeholder="FROM" maxlength="3" onkeyup="handleSearch(this)" style="background:var(--card); border:1px solid rgba(255,255,255,0.1); padding:15px; border-radius:15px; color:white; text-align:center; font-weight:bold; outline:none; text-transform:uppercase;">
        <input type="text" id="dest" placeholder="TO" maxlength="3" onkeyup="handleSearch(this)" style="background:var(--card); border:1px solid rgba(255,255,255,0.1); padding:15px; border-radius:15px; color:white; text-align:center; font-weight:bold; outline:none; text-transform:uppercase;">
    </div>

    <div class="journey-grid" id="slotGrid"></div>

    <div id="detailView" class="overlay">
        <div style="background:rgba(255,255,255,0.03); border-radius:30px; padding:25px; flex:1; overflow-y:auto;">
            <div id="detPlat" class="plat-pill"></div>
            <h2 id="detTitle" style="margin:10px 0; color:white;"></h2>
            <div id="detCount" style="font-size:40px; font-weight:900; color:var(--sr-gold); margin:10px 0;"></div>
            <div id="detReason" style="color:var(--sr-red); font-size:13px; font-weight:800; margin-bottom:20px;"></div>
            <div id="timelineContainer" style="border-left:2px solid rgba(255,255,255,0.1); padding-left:15px; font-size:14px; color:rgba(255,255,255,0.7);">
                <div id="detSch" style="margin-bottom:10px;"></div>
                <div id="detEst"></div>
            </div>
            <button class="btn-close" onclick="closeAll()">CLOSE TRACKER</button>
        </div>
    </div>

    <script>
        const PROXY_URL = "https://scotrail-bridge.vercel.app/api/darwin";
        let slots = Array(10).fill(null);

        function initApp() {
            const grid = document.getElementById('slotGrid');
            for(let i=0; i<10; i++) {
                grid.innerHTML += `<div class="slot" id="slot-${i}" onclick="viewSlot(${i})">
                    <div class="countdown" id="count-${i}"></div>
                    <div>
                        <div id="pill-${i}" class="plat-pill" style="display:none"></div>
                        <div class="label" style="font-size:12px; font-weight:800; color:white;">SLOT ${i+1}</div>
                        <div class="meta" style="font-size:10px; opacity:0.5; color:white;">EMPTY</div>
                    </div>
                </div>`;
            }
            setTimeout(() => { document.getElementById('splashScreen').style.display = 'none'; }, 1200);
        }

        function handleSearch(el) { if(el.value.length === 3) { el.blur(); fetchDarwin(el.value.toUpperCase(), null); } }

        async function fetchDarwin(crs, existingIdx) {
            const pulse = document.getElementById('pulse');
            const status = document.getElementById('status-text');
            pulse.classList.remove('pulse-off');
            status.innerText = "POLLING DARWIN...";

            try {
                const res = await fetch(PROXY_URL, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({crs: crs}) 
                });
                const data = await res.json();
                const service = data.trainServices?.[0];
                
                if(service) {
                    const idx = existingIdx !== null ? existingIdx : slots.findIndex(s => s === null);
                    if(idx !== -1) populateSlot(idx, service, crs);
                    status.innerText = "SYNC COMPLETE";
                } else {
                    status.innerText = "NO SERVICES FOUND";
                }
            } catch (e) { 
                status.innerText = "LINK TIMEOUT";
                pulse.classList.add('pulse-off');
            }
        }

        function calculateMins(timeStr) {
            if (timeStr === "On time") return 0;
            if (timeStr === "Departed" || !timeStr || !timeStr.includes(':')) return null;
            const [h, m] = timeStr.split(':').map(Number);
            const now = new Date();
            const target = new Date();
            target.setHours(h, m, 0);
            const diff = Math.round((target - now) / 60000);
            return diff > 0 ? diff : 0;
        }

        function populateSlot(idx, s, crs) {
            const isDelayed = s.etd !== "On time";
            const timeToUse = isDelayed ? s.etd : s.std;
            const mins = calculateMins(timeToUse);
            
            slots[idx] = { 
                crs, 
                title: `${crs} → ${s.destination[0].locationName}`, 
                etd: s.etd, 
                std: s.std, 
                mins, 
                platform: s.platform || "?", 
                platStatus: s.platsats === "hidden" ? 'predicted' : 'confirmed', 
                reason: s.delayReason || "" 
            };
            
            const el = document.getElementById(`slot-${idx}`);
            el.className = `slot occupied ${isDelayed ? 'delayed' : ''}`;
            el.querySelector('.label').innerText = slots[idx].title;
            el.querySelector('.meta').innerText = `${s.std} • ${s.etd}`;
            document.getElementById(`count-${idx}`).innerText = (mins !== null) ? `${mins}m` : "LIVE";
            
            const pill = document.getElementById(`pill-${idx}`);
            pill.style.display = "block";
            pill.className = `plat-pill plat-${slots[idx].platStatus}`;
            pill.innerText = (slots[idx].platStatus === 'predicted' ? 'PRED ' : '') + 'PLAT ' + slots[idx].platform;
        }

        function refreshAllSlots() {
            slots.forEach((s, i) => { if(s) fetchDarwin(s.crs, i); });
        }

        function viewSlot(idx) {
            if(!slots[idx]) return;
            const d = slots[idx];
            document.getElementById('detTitle').innerText = d.title;
            document.getElementById('detCount').innerText = (d.mins !== null) ? `${d.mins} MINS` : "LIVE";
            document.getElementById('detReason').innerText = d.reason ? `⚠️ ${d.reason}` : "✅ OPERATING ON TIME";
            document.getElementById('detPlat').innerText = `PLATFORM ${d.platform}`;
            document.getElementById('detPlat').className = `plat-pill plat-${d.platStatus}`;
            document.getElementById('detSch').innerText = `Scheduled: ${d.std}`;
            document.getElementById('detEst').innerText = `Estimated: ${d.etd}`;
            document.getElementById('detailView').classList.add('active');
        }

        function closeAll() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active')); }

        // Logic: Auto-refresh every 60s
        setInterval(refreshAllSlots, 60000);
    </script>
</body>
</html>
