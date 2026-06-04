// ==========================================
// 1. 公共辅助格式化函数
// ==========================================

function formatCapacitance(c) {
    if (c < 1e-12) return (c * 1e15).toFixed(3) + ' fF';
    if (c < 1e-9) return (c * 1e12).toFixed(3) + ' pF';
    if (c < 1e-6) return (c * 1e9).toFixed(3) + ' nF';
    if (c < 1e-3) return (c * 1e6).toFixed(3) + ' μF';
    return (c * 1e3).toFixed(3) + ' mF';
}

function formatInductance(l) {
    if (l < 1e-9) return (l * 1e12).toFixed(3) + ' pH';
    if (l < 1e-6) return (l * 1e9).toFixed(3) + ' nH';
    if (l < 1e-3) return (l * 1e6).toFixed(3) + ' μH';
    return (l * 1e3).toFixed(3) + ' mH';
}

function formatFreq(f) {
    if (f >= 1e9) return (f / 1e9).toFixed(3) + ' GHz';
    if (f >= 1e6) return (f / 1e6).toFixed(3) + ' MHz';
    if (f >= 1e3) return (f / 1e3).toFixed(3) + ' kHz';
    return f.toFixed(3) + ' Hz';
}

/**
 * 通用切比雪夫归一化原型参数递推函数
 * @param {number} n 滤波器阶数
 * @param {number} rippleDb 带内纹波(dB)
 * @returns {Array<number>} 1-indexed的g_k数组 (g[1] 到 g[n])
 */
function getChebyshevGArray(n, rippleDb) {
    const g = new Array(n + 1);
    const beta = Math.log(1 / Math.tanh(rippleDb / 17.3717792761));
    const gamma = Math.sinh(beta / (2 * n));
    
    const a = [];
    const b = [];
    for (let k = 1; k <= n; k++) {
        a[k] = Math.sin(((2 * k - 1) * Math.PI) / (2 * n));
        b[k] = gamma * gamma + Math.sin((k * Math.PI) / n) * Math.sin((k * Math.PI) / n);
    }
    
    g[1] = (2 * a[1]) / gamma;
    for (let k = 2; k <= n; k++) {
        g[k] = (4 * a[k - 1] * a[k]) / (b[k - 1] * g[k - 1]);
    }
    return g;
}

/**
 * 计算低通滤波器在特定频率处的理论衰减值
 * @param {string} filterType 'butterworth' | 'chebyshev'
 * @param {number} n 阶数
 * @param {number} fc 截止频率 (Hz)
 * @param {number} fTest 待测频率 (Hz)
 * @param {number} rippleDb 仅切比雪夫需要的通带波纹 (dB)
 * @returns {number} 衰减值 (dB)
 */
function calculateAttenuation(filterType, n, fc, fTest, rippleDb = 0.5) {
    const x = fTest / fc;
    if (filterType === 'butterworth') {
        return 10 * Math.log10(1 + Math.pow(x, 2 * n));
    } else if (filterType === 'chebyshev') {
        const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
        let Tn;
        if (x <= 1) {
            Tn = Math.cos(n * Math.acos(x));
        } else {
            Tn = Math.cosh(n * Math.acosh(x));
        }
        return 10 * Math.log10(1 + epsilon * epsilon * Tn * Tn);
    }
    return 0;
}

// 动态控制正向设计的纹波输入项显示
function onFilterTypeChange() {
    const filterType = document.getElementById('filterType').value;
    const rippleGroup = document.getElementById('rippleGroup');
    if (filterType === 'chebyshev') {
        rippleGroup.style.display = 'block';
    } else {
        rippleGroup.style.display = 'none';
    }
}

// 动态控制逆向反算的纹波输入项显示
function onReverseFilterTypeChange() {
    const filterType = document.getElementById('filterTypeReverse').value;
    const rippleGroup = document.getElementById('rippleGroupReverse');
    if (filterType === 'chebyshev') {
        rippleGroup.style.display = 'block';
    } else {
        rippleGroup.style.display = 'none';
    }
}


// ==========================================
// 2. 正向设计计算器逻辑
// ==========================================
function calculateFilter() {
    const freqInput = parseFloat(document.getElementById('freq').value);
    const freqUnit = parseFloat(document.getElementById('freqUnit').value);
    const impedance = parseFloat(document.getElementById('impedance').value);
    const order = parseInt(document.getElementById('orderForward').value); 
    const filterType = document.getElementById('filterType').value;

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

    const cardTop1 = document.getElementById('cardTop1');
    const cardTop2 = document.getElementById('cardTop2');
    const titleTop2 = document.getElementById('titleTop2');

    let values1 = [];
    let values2 = [];
    let g = new Array(n + 1);

    // 计算原型常数 g_k
    if (filterType === 'butterworth') {
        cardTop1.style.display = 'block';
        titleTop2.innerText = '拓扑结构 2：π型起始 (首元件并联电容)';

        for (let k = 1; k <= n; k++) {
            g[k] = 2 * Math.sin(((2 * k - 1) * Math.PI) / (2 * n));
        }
    } else if (filterType === 'chebyshev') {
        cardTop1.style.display = 'none'; // π型切比雪夫低通，隐藏T型起始
        titleTop2.innerText = '切比雪夫拓扑结构：π型起始 (首元件并联电容)';

        const rippleInput = parseFloat(document.getElementById('ripple').value);
        if (isNaN(rippleInput) || rippleInput <= 0) {
            alert("请输入大于 0 的有效带内纹波值！");
            return;
        }
        g = getChebyshevGArray(n, rippleInput);
    }

    // 元件转换并填表
    for (let k = 1; k <= n; k++) {
        const gk = g[k];

        // === 拓扑1 计算 (仅在巴特沃斯时可用) ===
        if (filterType === 'butterworth') {
            let type1 = (k % 2 !== 0) ? '串联电感 (L)' : '并联电容 (C)';
            let val1 = (k % 2 !== 0) ? formatInductance((gk * z0) / wc) : formatCapacitance(gk / (z0 * wc));
            values1.push(val1);
            
            tbody1.innerHTML += "<tr>" +
                "<td>" + k + "</td>" +
                "<td>" + type1 + "</td>" +
                "<td><strong>" + val1 + "</strong></td>" +
                "<td>" + gk.toFixed(4) + "</td>" +
            "</tr>";
        }

        // === 拓扑2 计算 (两类均需计算：π型起始) ===
        let type2 = (k % 2 !== 0) ? '并联电容 (C)' : '串联电感 (L)';
        let val2 = (k % 2 !== 0) ? formatCapacitance(gk / (z0 * wc)) : formatInductance((gk * z0) / wc);
        values2.push(val2);
        
        tbody2.innerHTML += "<tr>" +
            "<td>" + k + "</td>" +
            "<td>" + type2 + "</td>" +
            "<td><strong>" + val2 + "</strong></td>" +
            "<td>" + gk.toFixed(4) + "</td>" +
        "</tr>";
    }

    // 动态绘制正向原理图
    if (filterType === 'butterworth') {
        document.getElementById('diagramTop1').innerHTML = drawCircuitSVG(n, 1, values1);
    }
    document.getElementById('diagramTop2').innerHTML = drawCircuitSVG(n, 2, values2);

    // 动态更新原理卡片说明文字
    updateTheoryCard(filterType);

    // === 指定频率衰减值分析逻辑 ===
    const testFreqInput = parseFloat(document.getElementById('testFreq').value);
    const cardFreqResponse = document.getElementById('cardFreqResponse');
    
    if (!isNaN(testFreqInput) && testFreqInput > 0) {
        const testFreqUnit = parseFloat(document.getElementById('testFreqUnit').value);
        const fTest = testFreqInput * testFreqUnit;
        const rippleDb = filterType === 'chebyshev' ? parseFloat(document.getElementById('ripple').value) : 0;
        
        const attenVal = calculateAttenuation(filterType, n, fc, fTest, rippleDb);
        
        document.getElementById('resTestFreqStr').innerText = formatFreq(fTest);
        document.getElementById('resAttenuation').innerText = attenVal.toFixed(2);
        cardFreqResponse.style.display = 'block';
    } else {
        cardFreqResponse.style.display = 'none';
    }

    const resultsPanel = document.getElementById('resultsForward');
    resultsPanel.style.display = 'block';
    
    setTimeout(function() {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

// 动态渲染理论公式模块说明
function updateTheoryCard(filterType) {
    const theoryContent = document.getElementById('theoryContentForward');
    if (filterType === 'butterworth') {
        theoryContent.innerHTML = `
            <p class="theory-text"><strong>1. 最大平坦响应：</strong>巴特沃斯低通滤波器（Butterworth Filter）具有“最大平坦度”特性，其通带内频响最为平坦，无纹波；阻带内单调衰减（每阶衰减约为 -20dB/十倍频）。</p>
            <p class="theory-text"><strong>2. 归一化原型参数 (g<sub>k</sub>)：</strong>先计算截止频率为 1 rad/s、系统阻抗为 1 Ω 时的无量纲原型元件值：</p>
            <div class="formula-box">
                g<sub>k</sub> = 2 &times; sin <span class="bracket">(</span> <span class="fraction"><span>(2k - 1) &pi;</span><span class="divider"></span><span>2n</span></span> <span class="bracket">)</span>
            </div>
            <p class="theory-text"><strong>3. 标度变换（去归一化）：</strong>将归一化参数映射到实际截止角频率 <i>&omega;<sub>c</sub> = 2&pi;f<sub>c</sub></i> 与目标阻抗 <i>Z<sub>0</sub></i> 下，物理参数计算公式：</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <div class="formula-box mini">L<sub>k</sub> = <span class="fraction"><span>g<sub>k</sub> &times; Z<sub>0</sub></span><span class="divider"></span><span>&omega;<sub>c</sub></span></span></div>
                <div class="formula-box mini">C<sub>k</sub> = <span class="fraction"><span>g<sub>k</sub></span><span class="divider"></span><span>Z<sub>0</sub> &times; &omega;<sub>c</sub></span></span></div>
            </div>
        `;
    } else {
        theoryContent.innerHTML = `
            <p class="theory-text"><strong>1. 等波纹响应：</strong>切比雪夫低通滤波器（Chebyshev Filter）在通带内引入了允许的等波纹起伏（纹波），换取了比巴特沃斯滤波器更陡峭的过渡带衰减特性，在截止频率附近衰减更迅速。</p>
            <p class="theory-text"><strong>2. 归一化原型参数 (g<sub>k</sub>)：</strong>通过递推计算在 1 rad/s 截止频率和 1 Ω 系统阻抗下的无量纲原型元件值：</p>
            <div class="formula-box" style="font-size: 14px; padding: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
                &beta; = ln<span class="bracket">[</span>coth<span class="fraction"><span>A<sub>p</sub></span><span class="divider"></span><span>17.37</span></span><span class="bracket">]</span>, &nbsp;
                &gamma; = sinh<span class="bracket">(</span><span class="fraction"><span>&beta;</span><span class="divider"></span><span>2n</span></span><span class="bracket">)</span>
            </div>
            <div class="formula-box" style="font-size: 14px; padding: 12px; margin-top: 0; display: flex; flex-wrap: wrap; gap: 8px;">
                a<sub>k</sub> = sin<span class="fraction"><span>(2k-1)&pi;</span><span class="divider"></span><span>2n</span></span>, &nbsp;
                b<sub>k</sub> = &gamma;<sup>2</sup> + sin<sup>2</sup><span class="bracket">(</span><span class="fraction"><span>k&pi;</span><span class="divider"></span><span>n</span></span><span class="bracket">)</span>
            </div>
            <div class="formula-box" style="font-size: 14px; padding: 12px; margin-top: 0;">
                g<sub>1</sub> = <span class="fraction"><span>2 a<sub>1</sub></span><span class="divider"></span><span>&gamma;</span></span>, &nbsp;
                g<sub>k</sub> = <span class="fraction"><span>4 a<sub>k-1</sub> a<sub>k</sub></span><span class="divider"></span><span>b<sub>k-1</sub> g<sub>k-1</sub></span></span> (k &ge; 2)
            </div>
            <p class="theory-text"><strong>3. 标度变换（去归一化）：</strong>利用截止角频率 <i>&omega;<sub>c</sub> = 2&pi;f<sub>c</sub></i> 与目标阻抗 <i>Z<sub>0</sub></i> 将归一化原型转换为实际物理元件值（首元件为并联电容，交替排列）：</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <div class="formula-box mini">C<sub>k</sub> = <span class="fraction"><span>g<sub>k</sub></span><span class="divider"></span><span>Z<sub>0</sub> &times; &omega;<sub>c</sub></span></span> (k为奇数)</div>
                <div class="formula-box mini">L<sub>k</sub> = <span class="fraction"><span>g<sub>k</sub> &times; Z<sub>0</sub></span><span class="divider"></span><span>&omega;<sub>c</sub></span></span> (k为偶数)</div>
            </div>
        `;
    }
}


// ==========================================
// 3. 逆向参数反推逻辑
// ==========================================
function reverseCalculate() {
    const n = parseInt(document.getElementById('orderReverse').value); 
    const filterType = document.getElementById('filterTypeReverse').value;
    
    const posL = parseInt(document.getElementById('posL').value);
    const valL = parseFloat(document.getElementById('valL').value);
    const unitL = parseFloat(document.getElementById('unitL').value);
    
    const posC = parseInt(document.getElementById('posC').value);
    const valC = parseFloat(document.getElementById('valC').value);
    const unitC = parseFloat(document.getElementById('unitC').value);

    if (!n || !posL || !valL || !posC || !valC) {
        alert("请填写所有必需的反推参数！");
        return;
    }
    if (n < 2) {
        alert("反算要求阶数至少为 2！");
        return;
    }
    if (posL > n || posC > n) {
        alert("测量元件的总排序位置 (k/m) 不能大于滤波器的总阶数 n！");
        return;
    }
    if (posL === posC) {
        alert("错误：电感和电容不可能同时占据同一个排序位置！请从左到右依次确认它们是第几个元件。");
        return;
    }

    const L = valL * unitL;
    const C = valC * unitC;

    let gk, gm;

    if (filterType === 'butterworth') {
        gk = 2 * Math.sin(((2 * posL - 1) * Math.PI) / (2 * n));
        gm = 2 * Math.sin(((2 * posC - 1) * Math.PI) / (2 * n));
    } else {
        const rippleReverse = parseFloat(document.getElementById('rippleReverse').value);
        if (isNaN(rippleReverse) || rippleReverse <= 0) {
            alert("请输入大于 0 的有效逆向带内纹波值！");
            return;
        }
        const g = getChebyshevGArray(n, rippleReverse);
        gk = g[posL];
        gm = g[posC];
    }

    const fc = (1 / (2 * Math.PI)) * Math.sqrt((gk * gm) / (L * C));
    const z0 = Math.sqrt((L * gm) / (C * gk));

    document.getElementById('resFc').innerText = formatFreq(fc);
    document.getElementById('resZ0').innerText = z0.toFixed(2) + ' Ω';

    const resultsPanel = document.getElementById('resultsReverse');
    resultsPanel.style.display = 'block';
    
    setTimeout(function() {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

// ==========================================
// 4. SVG 电路图绘制函数核心
// ==========================================
function drawCircuitSVG(n, topologyType, values) {
    let width = 100 + n * 60;
    let height = 150;
    
    let svg = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
    
    let x = 40;            
    let ySignal = 50;      
    let yGround = 120;     
    let stroke = "#6750A4"; 
    
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
            svg += '<path d="M ' + x + ' ' + ySignal + ' c 5 -15, 15 -15, 20 0 c 5 -15, 15 -15, 20 0 c 5 -15, 15 -15, 20 0" stroke="' + stroke + '" stroke-width="2" fill="none" />';
            svg += '<text x="' + (x + 30) + '" y="' + (ySignal - 32) + '" text-anchor="middle" font-size="13" font-weight="bold" fill="' + stroke + '">' + name + '</text>';
            svg += '<text x="' + (x + 30) + '" y="' + (ySignal - 18) + '" text-anchor="middle" font-size="11" fill="#49454F">' + val + '</text>';
            x += 60;
        } else {
            svg += '<circle cx="' + x + '" cy="' + ySignal + '" r="3" fill="' + stroke + '"/>'; 
            svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + x + '" y2="75" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + (x - 12) + '" y1="75" x2="' + (x + 12) + '" y2="75" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + (x - 12) + '" y1="85" x2="' + (x + 12) + '" y2="85" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<line x1="' + x + '" y1="85" x2="' + x + '" y2="' + yGround + '" stroke="' + stroke + '" stroke-width="2"/>'; 
            svg += '<circle cx="' + x + '" cy="' + yGround + '" r="3" fill="' + stroke + '"/>'; 
            
            svg += '<text x="' + (x + 14) + '" y="78" text-anchor="start" font-size="13" font-weight="bold" fill="' + stroke + '">' + name + '</text>';
            svg += '<text x="' + (x + 14) + '" y="92" text-anchor="start" font-size="11" fill="#49454F">' + val + '</text>';
            
            if (firstParallelX === -1) firstParallelX = x;
            lastParallelX = x;
            
            svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + (x + 60) + '" y2="' + ySignal + '" stroke="' + stroke + '" stroke-width="2"/>';
            x += 60;
        }
    }
    
    svg += '<line x1="' + x + '" y1="' + ySignal + '" x2="' + (x + 20) + '" y2="' + ySignal + '" stroke="' + stroke + '" stroke-width="2"/>';
    svg += '<circle cx="' + (x + 24) + '" cy="' + ySignal + '" r="4" stroke="' + stroke + '" stroke-width="2" fill="none"/>';
    svg += '<text x="' + (x + 24) + '" y="' + (ySignal - 15) + '" text-anchor="middle" font-size="12" font-weight="bold" fill="#1D1B20">OUT</text>';
    
    if (firstParallelX !== -1) {
        svg += '<line x1="' + (firstParallelX - 20) + '" y1="' + yGround + '" x2="' + (lastParallelX + 20) + '" y2="' + yGround + '" stroke="' + stroke + '" stroke-width="2"/>';
        let midGnd = (firstParallelX + lastParallelX) / 2;
        svg += '<line / y1="' + yGround + '" x1="' + midGnd + '" x2="' + midGnd + '" y2="' + (yGround + 12) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 10) + '" y1="' + (yGround + 12) + '" x2="' + (midGnd + 10) + '" y2="' + (yGround + 12) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 6) + '" y1="' + (yGround + 17) + '" x2="' + (midGnd + 6) + '" y2="' + (yGround + 17) + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<line x1="' + (midGnd - 2) + '" y1="' + (yGround + 22) + '" x2="' + (midGnd + 2) + '" y2="' + (yGround + 22) + '" stroke="' + stroke + '" stroke-width="2"/>';
    }
    
    svg += '</svg>';
    return svg;
}