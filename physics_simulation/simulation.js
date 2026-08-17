// 质点动力学仿真程序 - 主应用程序
// 处理Canvas渲染、用户交互和仿真循环

class SimulationApp {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 物理引擎
        this.physics = new PhysicsEngine();
        
        // UI元素
        this.uiElements = this.initializeUI();
        
        // 仿真状态
        this.lastTime = 0;
        this.isPlaying = false;
        this.isDragging = false;
        this.dragStartPos = null;
        this.selectedObject = null;
        
        // 网格和坐标系
        this.gridSize = 50;
        
        // 初始化
        this.initializeEventListeners();
        this.setupDefaultScene();
        
        // 启动渲染循环
        requestAnimationFrame((time) => this.render(time));
    }
    
    initializeUI() {
        return {
            // 控制按钮
            playPauseBtn: document.getElementById('playPauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            clearBtn: document.getElementById('clearBtn'),
            
            // 滑块和值显示
            gravitySlider: document.getElementById('gravitySlider'),
            gravityValue: document.getElementById('gravityValue'),
            frictionSlider: document.getElementById('frictionSlider'),
            frictionValue: document.getElementById('frictionValue'),
            timeScaleSlider: document.getElementById('timeScaleSlider'),
            timeScaleValue: document.getElementById('timeScaleValue'),
            
            // 添加物体按钮
            addBlockBtn: document.getElementById('addBlockBtn'),
            addBoardBtn: document.getElementById('addBoardBtn'),
            addSlopeBtn: document.getElementById('addSlopeBtn'),
            addFloorBtn: document.getElementById('addFloorBtn'),
            
            // 物理参数输入
            massInput: document.getElementById('massInput'),
            vxInput: document.getElementById('vxInput'),
            vyInput: document.getElementById('vyInput'),
            
            // 力控制
            forceXInput: document.getElementById('forceXInput'),
            forceYInput: document.getElementById('forceYInput'),
            applyForceBtn: document.getElementById('applyForceBtn'),
            clearForceBtn: document.getElementById('clearForceBtn'),
            
            // 显示元素
            timeDisplay: document.getElementById('timeDisplay'),
            speedDisplay: document.getElementById('speedDisplay'),
            energyDisplay: document.getElementById('energyDisplay'),
            momentumDisplay: document.getElementById('momentumDisplay'),
            kineticEnergyDisplay: document.getElementById('kineticEnergyDisplay'),
            potentialEnergyDisplay: document.getElementById('potentialEnergyDisplay'),
            totalEnergyDisplay: document.getElementById('totalEnergyDisplay'),
            frictionLossDisplay: document.getElementById('frictionLossDisplay')
        };
    }
    
    initializeEventListeners() {
        console.log('初始化事件监听器...');
        
        // 检查UI元素是否存在
        console.log('检查UI元素:', {
            addBlockBtn: this.uiElements.addBlockBtn,
            addBoardBtn: this.uiElements.addBoardBtn,
            addSlopeBtn: this.uiElements.addSlopeBtn,
            addFloorBtn: this.uiElements.addFloorBtn
        });
        
        // 播放/暂停按钮
        this.uiElements.playPauseBtn.addEventListener('click', () => {
            console.log('播放/暂停按钮被点击');
            this.togglePlayPause();
        });
        
        // 重置按钮
        this.uiElements.resetBtn.addEventListener('click', () => {
            console.log('重置按钮被点击');
            this.resetSimulation();
        });
        
        // 清空按钮
        this.uiElements.clearBtn.addEventListener('click', () => {
            console.log('清空按钮被点击');
            this.clearSimulation();
        });
        
        // 重力滑块
        this.uiElements.gravitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.uiElements.gravityValue.textContent = value.toFixed(1);
            this.physics.gravity = value;
        });
        
        // 摩擦因数滑块
        this.uiElements.frictionSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.uiElements.frictionValue.textContent = value.toFixed(2);
            this.physics.frictionCoefficient = value;
        });
        
        // 时间缩放滑块
        this.uiElements.timeScaleSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.uiElements.timeScaleValue.textContent = value.toFixed(1);
            this.physics.timeScale = value;
        });
        
        // 添加物体按钮
        this.uiElements.addBlockBtn.addEventListener('click', () => {
            console.log('添加滑块按钮被点击');
            this.addBlockAtRandom();
        });
        this.uiElements.addBoardBtn.addEventListener('click', () => {
            console.log('添加长木板按钮被点击');
            this.addBoardAtRandom();
        });
        this.uiElements.addSlopeBtn.addEventListener('click', () => {
            console.log('添加斜面按钮被点击');
            this.addSlopeAtRandom();
        });
        this.uiElements.addFloorBtn.addEventListener('click', () => {
            console.log('添加水平面按钮被点击');
            this.addCustomFloor();
        });
        
        // 施加力按钮
        this.uiElements.applyForceBtn.addEventListener('click', () => {
            console.log('施加力按钮被点击');
            this.applyForce();
        });
        this.uiElements.clearForceBtn.addEventListener('click', () => {
            console.log('清除力按钮被点击');
            this.clearForces();
        });
        
        // Canvas事件
        this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        console.log('事件监听器初始化完成');
    }
    
    setupDefaultScene() {
        // 添加一个长木板
        const board = this.physics.addObject('board', new Vector2(100, 400), 200, 20, {
            static: true,
            frictionCoefficient: 0.3
        });
        
        // 添加一个斜面
        const slope = this.physics.addObject('slope', new Vector2(400, 450), 150, 80, {
            static: true,
            frictionCoefficient: 0.4
        });
        
        // 在木板上添加一个滑块
        const blockOnBoard = this.physics.addObject('block', new Vector2(150, 380), 40, 40, {
            mass: 2.0,
            frictionCoefficient: 0.2
        });
        
        // 在斜面上添加一个滑块
        const blockOnSlope = this.physics.addObject('block', new Vector2(420, 400), 40, 40, {
            mass: 2.0,
            frictionCoefficient: 0.2
        });
    }
    
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.physics.start();
            this.uiElements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
            this.uiElements.playPauseBtn.classList.remove('btn-primary');
            this.uiElements.playPauseBtn.classList.add('btn-warning');
        } else {
            this.physics.pause();
            this.uiElements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> 开始';
            this.uiElements.playPauseBtn.classList.remove('btn-warning');
            this.uiElements.playPauseBtn.classList.add('btn-primary');
        }
    }
    
    resetSimulation() {
        this.physics.reset();
        this.isPlaying = false;
        this.physics.pause();
        this.uiElements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> 开始';
        this.uiElements.playPauseBtn.classList.remove('btn-warning');
        this.uiElements.playPauseBtn.classList.add('btn-primary');
        
        // 更新显示
        this.updatePhysicsDisplays();
    }
    
    clearSimulation() {
        this.physics.clearObjects();
        this.setupDefaultScene();
        this.resetSimulation();
    }
    
    addBlockAtRandom() {
        try {
            const mass = parseFloat(this.uiElements.massInput.value) || 1.0;
            const vx = parseFloat(this.uiElements.vxInput.value) || 0;
            const vy = parseFloat(this.uiElements.vyInput.value) || 0;
            
            const x = 100 + Math.random() * 500;
            const y = 100 + Math.random() * 300;
            
            console.log(`添加滑块: 位置(${x}, ${y}), 质量${mass}kg, 初速度(${vx}, ${vy})`);
            
            const block = this.physics.addObject('block', new Vector2(x, y), 40, 40, {
                mass: mass,
                frictionCoefficient: this.physics.frictionCoefficient
            });
            
            console.log(`滑块添加成功，总物体数: ${this.physics.objects.length}`);
            
            this.physics.setInitialVelocity(block, new Vector2(vx, vy));
        } catch (error) {
            console.error('添加滑块时出错:', error);
        }
    }
    
    addBoardAtRandom() {
        const x = 100 + Math.random() * 500;
        const y = 400 + Math.random() * 100;
        
        this.physics.addObject('board', new Vector2(x, y), 200, 20, {
            static: true,
            frictionCoefficient: this.physics.frictionCoefficient
        });
    }
    
    addSlopeAtRandom() {
        const x = 100 + Math.random() * 500;
        const y = 400 + Math.random() * 100;
        
        this.physics.addObject('slope', new Vector2(x, y), 150, 80, {
            static: true,
            frictionCoefficient: this.physics.frictionCoefficient
        });
    }
    
    addCustomFloor() {
        const x = 100 + Math.random() * 400;
        const y = 550;
        
        this.physics.addObject('floor', new Vector2(x, y), 200, 20, {
            static: true,
            frictionCoefficient: this.physics.frictionCoefficient
        });
    }
    
    applyForce() {
        const fx = parseFloat(this.uiElements.forceXInput.value) || 0;
        const fy = parseFloat(this.uiElements.forceYInput.value) || 0;
        
        const force = new Vector2(fx, fy);
        
        if (this.selectedObject) {
            this.physics.applyForceToSelected(force);
        } else {
            // 如果没有选中物体，给所有动态物体施加力
            for (const obj of this.physics.objects) {
                if (!obj.static) {
                    obj.applyForce(force);
                }
            }
        }
    }
    
    clearForces() {
        for (const obj of this.physics.objects) {
            if (!obj.static) {
                obj.clearForces();
            }
        }
        
        // 清空输入
        this.uiElements.forceXInput.value = '0';
        this.uiElements.forceYInput.value = '0';
    }
    
    onCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.dragStartPos = new Vector2(x, y);
        this.selectedObject = this.physics.selectObjectAt(this.dragStartPos);
        
        if (this.selectedObject) {
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    onCanvasMouseMove(e) {
        if (!this.isDragging || !this.selectedObject) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 更新选中物体的位置
        if (!this.selectedObject.static) {
            this.selectedObject.position.x = x - this.selectedObject.width / 2;
            this.selectedObject.position.y = y - this.selectedObject.height / 2;
        }
    }
    
    onCanvasMouseUp(e) {
        if (this.isDragging && this.selectedObject) {
            // 如果拖动速度足够快，给物体一个初速度
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (this.dragStartPos) {
                const dragEndPos = new Vector2(x, y);
                const dragVector = dragEndPos.subtract(this.dragStartPos);
                
                // 根据拖动距离设置初速度
                if (!this.selectedObject.static && dragVector.magnitude() > 5) {
                    const velocity = dragVector.multiply(0.5); // 缩放因子
                    this.physics.setInitialVelocity(this.selectedObject, velocity);
                }
            }
        }
        
        this.isDragging = false;
        this.physics.deselectObject();
        this.selectedObject = null;
        this.canvas.style.cursor = 'default';
    }
    
    onCanvasClick(e) {
        // 简单的点击选择（如果没有拖动）
        if (!this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const clickedObject = this.physics.selectObjectAt(new Vector2(x, y));
            
            if (clickedObject) {
                this.selectedObject = clickedObject;
                
                // 更新UI显示选中物体的信息
                this.updateObjectInfoDisplay(clickedObject);
            } else {
                this.physics.deselectObject();
                this.selectedObject = null;
            }
        }
    }
    
    onKeyDown(e) {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'r':
            case 'R':
                this.resetSimulation();
                break;
            case 'c':
            case 'C':
                this.clearSimulation();
                break;
            case 'b':
            case 'B':
                this.addBlockAtRandom();
                break;
        }
    }
    
    updateObjectInfoDisplay(obj) {
        // 这里可以添加显示选中物体信息的UI
        console.log(`选中物体: ${obj.type}, 质量: ${obj.mass}kg, 速度: ${obj.velocity.toString()} m/s`);
    }
    
    updatePhysicsDisplays() {
        const info = this.physics.getPhysicsInfo();
        
        // 更新时间显示
        this.uiElements.timeDisplay.textContent = info.time.toFixed(2);
        
        // 计算平均速度（如果有物体）
        let avgSpeed = 0;
        if (info.objectCount > 0) {
            avgSpeed = info.momentum.magnitude() / (info.objectCount * 1.0); // 简化计算
        }
        this.uiElements.speedDisplay.textContent = avgSpeed.toFixed(2);
        
        // 能量显示
        this.uiElements.energyDisplay.textContent = info.totalEnergy.toFixed(2);
        this.uiElements.kineticEnergyDisplay.textContent = info.kineticEnergy.toFixed(2);
        this.uiElements.potentialEnergyDisplay.textContent = info.potentialEnergy.toFixed(2);
        this.uiElements.totalEnergyDisplay.textContent = info.totalEnergy.toFixed(2);
        
        // 动量显示
        this.uiElements.momentumDisplay.textContent = info.momentum.magnitude().toFixed(2);
        
        // 摩擦损耗
        this.uiElements.frictionLossDisplay.textContent = info.frictionLoss.toFixed(2);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(100, 181, 246, 0.2)';
        this.ctx.lineWidth = 1;
        
        // 垂直线
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 水平线
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 坐标轴
        this.ctx.strokeStyle = 'rgba(100, 181, 246, 0.5)';
        this.ctx.lineWidth = 2;
        
        // X轴
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 20);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 20);
        this.ctx.stroke();
        
        // Y轴
        this.ctx.beginPath();
        this.ctx.moveTo(20, 0);
        this.ctx.lineTo(20, this.canvas.height);
        this.ctx.stroke();
        
        // 坐标标签
        this.ctx.fillStyle = 'rgba(100, 181, 246, 0.8)';
        this.ctx.font = '12px Roboto';
        this.ctx.fillText('0', 25, this.canvas.height - 5);
        this.ctx.fillText('X', this.canvas.width - 15, this.canvas.height - 5);
        this.ctx.fillText('Y', 5, 15);
    }
    
    drawPhysicsObjects() {
        for (const obj of this.physics.objects) {
            // 保存画布状态
            this.ctx.save();
            
            // 设置填充颜色
            if (obj.isSelected) {
                this.ctx.fillStyle = '#FFD166'; // 选中时显示黄色
            } else {
                this.ctx.fillStyle = obj.color;
            }
            
            // 绘制物体
            if (obj.type === 'slope') {
                // 绘制斜面（三角形）
                this.ctx.beginPath();
                this.ctx.moveTo(obj.position.x, obj.position.y + obj.height);
                this.ctx.lineTo(obj.position.x + obj.width, obj.position.y + obj.height);
                this.ctx.lineTo(obj.position.x, obj.position.y);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // 绘制矩形（滑块、木板、地面）
                this.ctx.fillRect(obj.position.x, obj.position.y, obj.width, obj.height);
            }
            
            // 绘制边框
            this.ctx.strokeStyle = obj.isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = obj.isSelected ? 3 : 1;
            
            if (obj.type === 'slope') {
                this.ctx.beginPath();
                this.ctx.moveTo(obj.position.x, obj.position.y + obj.height);
                this.ctx.lineTo(obj.position.x + obj.width, obj.position.y + obj.height);
                this.ctx.lineTo(obj.position.x, obj.position.y);
                this.ctx.closePath();
                this.ctx.stroke();
            } else {
                this.ctx.strokeRect(obj.position.x, obj.position.y, obj.width, obj.height);
            }
            
            // 绘制速度向量
            if (!obj.static && obj.velocity.magnitude() > 0.1) {
                const centerX = obj.position.x + obj.width / 2;
                const centerY = obj.position.y + obj.height / 2;
                
                // 速度向量缩放
                const scale = 10;
                const endX = centerX + obj.velocity.x * scale;
                const endY = centerY + obj.velocity.y * scale;
                
                // 绘制箭头
                this.ctx.strokeStyle = '#FF6B6B';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                
                // 绘制箭头头部
                const angle = Math.atan2(obj.velocity.y, obj.velocity.x);
                const arrowLength = 8;
                
                this.ctx.beginPath();
                this.ctx.moveTo(endX, endY);
                this.ctx.lineTo(
                    endX - arrowLength * Math.cos(angle - Math.PI / 6),
                    endY - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.moveTo(endX, endY);
                this.ctx.lineTo(
                    endX - arrowLength * Math.cos(angle + Math.PI / 6),
                    endY - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.stroke();
                
                // 速度值标签
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.font = '10px Roboto';
                const speed = obj.velocity.magnitude().toFixed(1);
                this.ctx.fillText(`${speed} m/s`, endX + 5, endY - 5);
            }
            
            // 恢复画布状态
            this.ctx.restore();
        }
    }
    
    drawInfoOverlay() {
        const info = this.physics.getPhysicsInfo();
        
        // 绘制物理信息叠加层
        this.ctx.fillStyle = 'rgba(25, 25, 35, 0.8)';
        this.ctx.fillRect(10, 10, 250, 120);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px Roboto';
        this.ctx.fillText(`时间: ${info.time.toFixed(2)} s`, 20, 30);
        this.ctx.fillText(`物体数量: ${info.objectCount}`, 20, 50);
        this.ctx.fillText(`总能量: ${info.totalEnergy.toFixed(2)} J`, 20, 70);
        this.ctx.fillText(`动量: ${info.momentum.magnitude().toFixed(2)} kg·m/s`, 20, 90);
        this.ctx.fillText(`摩擦损耗: ${info.frictionLoss.toFixed(2)} J`, 20, 110);
        
        // 绘制操作提示
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Roboto';
        this.ctx.fillText('空格: 播放/暂停 | R: 重置 | C: 清空 | B: 添加滑块', 10, this.canvas.height - 10);
    }
    
    render(currentTime) {
        // 计算时间增量
        const dt = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
        this.lastTime = currentTime;
        
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.ctx.fillStyle = '#0a0e17';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 更新物理仿真
        if (this.isPlaying) {
            this.physics.update(dt);
            this.updatePhysicsDisplays();
        }
        
        // 绘制物理物体
        this.drawPhysicsObjects();
        
        // 绘制信息叠加层
        this.drawInfoOverlay();
        
        // 继续渲染循环
        requestAnimationFrame((time) => this.render(time));
    }
}

// 当页面加载完成后初始化应用
window.addEventListener('load', () => {
    // 添加一些CSS类到按钮
    const style = document.createElement('style');
    style.textContent = `
        .btn-warning {
            background: linear-gradient(135deg, #FFA726 0%, #FB8C00 100%) !important;
            color: white !important;
        }
        .btn-warning:hover {
            background: linear-gradient(135deg, #FB8C00 0%, #EF6C00 100%) !important;
        }
    `;
    document.head.appendChild(style);
    
    // 初始化应用
    window.simulationApp = new SimulationApp();
    
    console.log('质点动力学仿真程序已启动！');
    console.log('使用说明:');
    console.log('- 点击物体进行选择');
    console.log('- 拖动物体并释放以给予初速度');
    console.log('- 使用右侧面板控制仿真参数');
    console.log('- 空格键: 播放/暂停');
    console.log('- R键: 重置仿真');
    console.log('- C键: 清空所有物体');
    console.log('- B键: 添加新滑块');
});