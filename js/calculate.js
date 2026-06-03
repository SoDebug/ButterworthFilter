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
        // 获取输入值
        const freqInput = parseFloat(document.getElementById('freq').value);
        const freqUnit = parseFloat(document.getElementById('freqUnit').value);
        const impedance = parseFloat(document.getElementById('impedance').value);
        const order = parseInt(document.getElementById('order').value);

        if (!freqInput || !impedance || !order) {
            alert("请填写所有必要的参数！");
            return;
        }

        const fc = freqInput * freqUnit;      // 截止频率 (Hz)
        const z0 = impedance;                 // 特性阻抗 (Ohm)
        const n = order;                      // 阶数

        const wc = 2 * Math.PI * fc;          // 角频率 (rad/s)

        const tbody1 = document.querySelector('#tableTop1 tbody');
        const tbody2 = document.querySelector('#tableTop2 tbody');
        
        tbody1.innerHTML = '';
        tbody2.innerHTML = '';

        for (let k = 1; k <= n; k++) {
            // 计算巴特沃斯归一化元件值 (g_k)
            // 公式: g_k = 2 * sin( (2k - 1) * pi / (2n) )
            const gk = 2 * Math.sin(((2 * k - 1) * Math.PI) / (2 * n));

            // 拓扑1：奇数为串联电感，偶数为并联电容
            let type1 = (k % 2 !== 0) ? '串联电感 (L)' : '并联电容 (C)';
            let val1 = (k % 2 !== 0) 
                        ? formatInductance((gk * z0) / wc) 
                        : formatCapacitance(gk / (z0 * wc));
            
            tbody1.innerHTML += `
                <tr>
                    <td>${k}</td>
                    <td>${type1}</td>
                    <td><strong>${val1}</strong></td>
                    <td>${gk.toFixed(4)}</td>
                </tr>
            `;

            // 拓扑2：奇数为并联电容，偶数为串联电感
            let type2 = (k % 2 !== 0) ? '并联电容 (C)' : '串联电感 (L)';
            let val2 = (k % 2 !== 0) 
                        ? formatCapacitance(gk / (z0 * wc)) 
                        : formatInductance((gk * z0) / wc);
            
            tbody2.innerHTML += `
                <tr>
                    <td>${k}</td>
                    <td>${type2}</td>
                    <td><strong>${val2}</strong></td>
                    <td>${gk.toFixed(4)}</td>
                </tr>
            `;
        }

        // 显示结果区域
        document.getElementById('results').style.display = 'block';
        
        // 滚动到结果区域
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }