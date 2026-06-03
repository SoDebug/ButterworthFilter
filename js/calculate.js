// 格式化电容值单位 (F)
function formatCapacitance(c) {
    if (c < 1e-12) return (c * 1e15).toFixed(3) + ' fF';
    if (c < 1e-9) return (c * 1e12).toFixed(3) + ' pF';
    if (c < 1e-6) return (c * 1e9).toFixed(3) + ' nF';
    if (c < 1e-3) return (c * 1e6).toFixed(3) + ' μF';
    return (c * 1e3).toFixed(3) + ' mF';
}

// 格式化电感值单位 (H)
function formatInductance(l) {
    if (l < 1e-9) return (l * 1e12).toFixed(3) + ' pH';
    if (l < 1e-6) return (l * 1e9).toFixed(3) + ' nH';
    if (l < 1e-3) return (l * 1e6).toFixed(3) + ' μH';
    return (l * 1e3).toFixed(3) + ' mH';
}

function calculateFilter() {
    const freqInput = parseFloat(document.getElementById('freq').value);
    const freqUnit = parseFloat(document.getElementById('freqUnit').value);
    const impedance = parseFloat(document.getElementById('impedance').value);
    const order = parseInt(document.getElementById('order').value);

    if (!freqInput || !impedance || !order) {
        alert("请填写所有必要的参数！");
        return;
    }

    const fc = freqInput * freqUnit;
    const z0 = impedance;
    const n = order;
    const wc = 2 * Math.PI * fc;

    const tbody1 = document.querySelector('#tableTop1 tbody');
    const tbody2 = document.querySelector('#tableTop2 tbody');
    tbody1.innerHTML = '';
    tbody2.innerHTML = '';

    // 用于保存计算结果以便绘制电路图
    let values1 = [];
    let values2 = [];

    for (let k = 1; k <= n; k++) {
        const gk = 2 * Math.sin(((2 * k - 1) * Math.PI) / (2 * n));

        // === 拓扑1 计算 ===
        let type1 = (k % 2 !== 0) ? '串联电感 (L)' : '并联电容 (C)';
        let val1 = (k % 2 !== 0) ? formatInductance((gk * z0) / wc) : formatCapacitance(gk / (z0 * wc));
        values1.push(val1); // 保存数值
        
        tbody1.innerHTML += "<tr>" +
            "<td>" + k + "</td>" +
            "<td>" + type1 + "</td>" +
            "<td><strong>" + val1 + "</strong></td>" +
            "<td>" + gk.toFixed(4) + "</td>" +
        "</tr>";

        // === 拓扑2 计算 ===
        let type2 = (k % 2 !== 0) ? '并联电容 (C)' : '串联电感 (L)';
        let val2 = (k % 2 !== 0) ? formatCapacitance(gk / (z0 * wc)) : formatInductance((gk * z0) / wc);
        values2.push(val2); // 保存数值
        
        tbody2.innerHTML += "<tr>" +
            "<td>" + k + "</td>" +
            "<td>" + type2 + "</td>" +
            "<td><strong>" + val2 + "</strong></td>" +
            "<td>" + gk.toFixed(4) + "</td>" +
        "</tr>";
    }

    // === 动态绘制原理图 ===
    document.getElementById('diagramTop1').innerHTML = drawCircuitSVG(n, 1, values1);
    document.getElementById('diagramTop2').innerHTML = drawCircuitSVG(n, 2, values2);

    document.getElementById('results').style.display = 'block';
    
    // 平滑滚动
    setTimeout(function() {
        const y = document.getElementById('results').getBoundingClientRect().top + window.scrollY - 20;
        window.scrollTo({top: y, behavior: 'smooth'});
    }, 50);
}

// ==========================================
// 动态生成 SVG 原理图
// ==========================================
function drawCircuitSVG(n, topologyType, values) {
    let width = 100 + n * 60; // 根据阶数自适应画布宽度
    let height = 150;
    
    let svg = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
    
    let x = 40;            // 起始 X 坐标
    let ySignal = 50;      // 顶部信号线 Y 坐标
    let yGround = 120;     // 底部地线 Y 坐标
    let stroke = "#6750A4"; // MD3 Primary 色
    
    // 绘制输入端口 (IN)
    svg += '<circle cx="20" cy="' + ySignal + '" r="4" stroke="' + stroke + '" stroke-width="2" fill="none"/>';
    svg += '<line x1="24" y1="' + ySignal + '" x2="' + x + '" y2="' + ySignal + '" stroke="' + stroke + '" stroke-width="2"/>';
    svg += '<text x="20" y="' + (ySignal - 15) + '" text-anchor="middle" font-size="12" font-weight="bold" fill="#1D1B20">IN</text>';
    
    let firstParallelX = -1;
    let lastParallelX = -1;
    
    for (let k = 1; k <= n; k++) {
        let isSeries = (topologyType === 1) ? (k % 2 !== 0) : (k % 2 === 0);
        let name = isSeries ? 'L' + k : 'C' + k;
        let val = values[k - 1];
        
        if (isSeries) {
            // 绘制串联电感
            svg += '<path d="M ' + x + ' ' + ySignal + ' c 5 -15, 15 -15, 20 0 c 5 -15, 15 -15, 20 0 c 5 -15, 15 -15, 20 0" stroke="' + stroke + '" stroke-width="2" fill="none" />';
            svg += '<text x="' + (x + 30) + '" y="' + (ySignal - 24) + '" text-anchor="middle" font-size="13" font-weight="bold" fill="' + stroke + '">' + name + '</text>';
            svg += '<text x="' + (x + 30) + '" y="' + (ySignal - 10) + '" text-anchor="middle" font-size="11" fill="#49454F">' + val + '</text>';
            x += 60;
        } else {
            // 绘制并联电容
            svg += '<circle cx="' + x + '" cy="' + ySignal + '" r="3" fill="' + stroke + '"/>'; 
            svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + x + '" y2="75" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + (x - 12) + '" y1="75" x2="' + (x + 12) + '" y2="75" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + (x - 12) + '" y1="85" x2="' + (x + 12) + '" y2="85" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + x + '" y1="85" x2="' + x + '" y2="' + yGround + '" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<circle cx="' + x + '" cy="' + yGround + '" r="3" fill="' + stroke + '"/>'; 
            
            // 电容编号和数值标签
            svg += '<text x="' + (x + 14) + '" y="78" text-anchor="start" font-size="13" font-weight="bold" fill="' + stroke + '">' + name + '</text>';
            svg += '<text x="' + (x + 14) + '" y="92" text-anchor="start" font-size="11" fill="#49454F">' + val + '</text>';
            
            if (firstParallelX === -1) firstParallelX = x;
            lastParallelX = x;
            
            // 信号线穿过电容节点
            svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + (x + 60) + '" y2="' + ySignal + '" stroke="' + stroke + '" stroke-width="2"/>';
            x += 60;
        }
    }
    
    // 绘制输出端口 (OUT)
    svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + (x + 20) + '" y2="' + ySignal + '" stroke="' + stroke + '" stroke-width="2"/>';
    svg += '<circle cx="' + (x + 24) + '" cy="' + ySignal + '" r="4" stroke="' + stroke + '" stroke-width="2" fill="none"/>';
    svg += '<text x="' + (x + 24) + '" y="' + (ySignal - 15) + '" text-anchor="middle" font-size="12" font-weight="bold" fill="#1D1B20">OUT</text>';
    
    // 绘制公共地线 (如果有并联元件)
    if (firstParallelX !== -1) {
        svg += '<line x1="' + (firstParallelX - 20) + '" y1="' + yGround + '" x2="' + (lastParallelX + 20) + '" y2="' + yGround + '" stroke="' + stroke + '" stroke-width="2"/>';
        let midGnd = (firstParallelX + lastParallelX) / 2;
        svg += '<line x1="' + midGnd + '" y1="' + yGround + '" x2="' + midGnd + '" y2="' + (yGround + 12) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 10) + '" y1="' + (yGround + 12) + '" x2="' + (midGnd + 10) + '" y2="' + (yGround + 12) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 6) + '" y1="' + (yGround + 17) + '" x2="' + (midGnd + 6) + '" y2="' + (yGround + 17) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 2) + '" y1="' + (yGround + 22) + '" x2="' + (midGnd + 2) + '" y2="' + (yGround + 22) + '" stroke="' + stroke + '" stroke-width="2"/>';
    }
    
    svg += '</svg>';
    return svg;
}