// 物理引擎核心模块
// 质点动力学仿真程序

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    
    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}

class PhysicsObject {
    constructor(type, position, width, height, options = {}) {
        this.type = type; // 'block', 'board', 'slope', 'floor'
        this.position = position;
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.width = width;
        this.height = height;
        
        // 物理属性
        this.mass = options.mass || 1.0;
        this.restitution = options.restitution || 0.8; // 弹性系数
        this.static = options.static || false;
        this.angle = options.angle || 0; // 用于斜面
        this.frictionCoefficient = options.frictionCoefficient || 0.2;
        
        // 力和状态
        this.forces = new Vector2(0, 0);
        this.isSelected = false;
        this.color = options.color || this.getDefaultColor();
        
        // 能量跟踪
        this.kineticEnergy = 0;
        this.potentialEnergy = 0;
        
        // 斜面特定属性
        if (type === 'slope') {
            this.slopeLength = Math.sqrt(width * width + height * height);
            this.slopeAngle = Math.atan2(height, width);
        }
    }
    
    getDefaultColor() {
        switch (this.type) {
            case 'block': return '#FF6B6B'; // 红色
            case 'board': return '#4ECDC4'; // 青色
            case 'slope': return '#45B7D1'; // 蓝色
            case 'floor': return '#96CEB4'; // 绿色
            default: return '#FFD166'; // 黄色
        }
    }
    
    applyForce(force) {
        if (!this.static) {
            this.forces = this.forces.add(force);
        }
    }
    
    clearForces() {
        this.forces = new Vector2(0, 0);
    }
    
    // 更新签名：增加 groundLevel 以便计算势能时不依赖硬编码
    update(dt, gravity, frictionCoefficient, groundLevel) {
        if (this.static) return;
        
        // 应用重力
        const gravityForce = new Vector2(0, gravity * this.mass);
        this.applyForce(gravityForce);
        
        // 计算加速度: F = ma -> a = F/m
        this.acceleration = this.forces.multiply(1 / this.mass);
        
        // 更新速度: v = v0 + a*dt
        this.velocity = this.velocity.add(this.acceleration.multiply(dt));
        
        // 注意：摩擦力现在由PhysicsEngine在update方法中通过applyFrictionOnSurface应用
        // 这里的frictionCoefficient参数保留但不再使用
        
        // 更新位置: x = x0 + v*dt
        this.position = this.position.add(this.velocity.multiply(dt));
        
        // 计算能量
        this.calculateEnergy(gravity, groundLevel);
        
        // 清除力用于下一帧
        this.clearForces();
    }
    
    applyFriction(frictionCoefficient, dt) {
        // 空实现，保持兼容性
        // 实际的摩擦力应用现在由PhysicsEngine通过applyFrictionOnSurface处理
    }
    
    getSupportingSurface(physicsEngine) {
        // 检查物体下方是否有支撑表面（静态物体）
        if (!physicsEngine || !physicsEngine.objects) return null;
        
        // 创建一个稍微向下的检测框，检查是否与静态物体接触
        const detectionBox = {
            x: this.position.x,
            y: this.position.y + this.height, // 从物体底部开始
            width: this.width,
            height: 5 // 检测高度
        };
        
        for (const obj of physicsEngine.objects) {
            if (obj.static && obj !== this) {
                // 检查检测框是否与静态物体相交
                if (detectionBox.x < obj.position.x + obj.width &&
                    detectionBox.x + detectionBox.width > obj.position.x &&
                    detectionBox.y < obj.position.y + obj.height &&
                    detectionBox.y + detectionBox.height > obj.position.y) {
                    return obj; // 返回支撑表面
                }
            }
        }
        
        return null;
    }
    
    applyFrictionOnSurface(supportingSurface, frictionCoefficient, dt, gravity) {
        // 在支撑表面上应用摩擦力
        if (!supportingSurface) return;
        
        // 对于斜面，需要特殊处理
        if (supportingSurface.type === 'slope') {
            this.applySlopeFriction(supportingSurface, frictionCoefficient, dt, gravity);
            return;
        }
        
        // 对于水平表面（木板、地面）
        this.applyHorizontalFriction(supportingSurface, frictionCoefficient, dt, gravity);
    }
    
    applyHorizontalFriction(supportingSurface, frictionCoefficient, dt, gravity) {
        // 在水平表面上应用摩擦力
        
        // 法向力 = 质量 * 重力加速度
        const normalForce = this.mass * gravity;
        
        // 最大静摩擦力 = 摩擦系数 * 法向力
        const maxFrictionForce = frictionCoefficient * normalForce;
        
        // 如果速度很小，直接停止
        if (this.velocity.magnitude() < 0.1) {
            this.velocity = new Vector2(0, 0);
            return;
        }
        
        // 摩擦力方向与速度方向相反
        const frictionDirection = this.velocity.multiply(-1).normalize();
        const frictionForce = frictionDirection.multiply(maxFrictionForce);
        
        // 计算摩擦力对速度的影响
        const frictionAcceleration = frictionForce.multiply(1 / this.mass);
        const velocityChange = frictionAcceleration.multiply(dt);
        
        // 确保摩擦力不会使速度反向
        const velocityMagnitude = this.velocity.magnitude();
        const velocityChangeMagnitude = velocityChange.magnitude();
        
        if (velocityChangeMagnitude >= velocityMagnitude) {
            this.velocity = new Vector2(0, 0);
        } else {
            this.velocity = this.velocity.add(velocityChange);
        }
    }
    
    applySlopeFriction(slopeSurface, frictionCoefficient, dt, gravity) {
        // 在斜面上应用摩擦力
        const slopeAngle = slopeSurface.slopeAngle;
        
        // 重力分解
        // 沿斜面的分力：F_parallel = m * g * sin(θ)
        // 垂直斜面的分力：F_perpendicular = m * g * cos(θ)
        const parallelForce = this.mass * gravity * Math.sin(slopeAngle);
        const perpendicularForce = this.mass * gravity * Math.cos(slopeAngle);
        
        // 斜面法线方向
        const normalX = -Math.sin(slopeAngle);
        const normalY = Math.cos(slopeAngle);
        
        // 当前速度在斜面方向上的分量
        const tangentX = normalY;  // 与法线垂直
        const tangentY = -normalX;
        
        // 速度在斜面方向上的投影
        const velocityAlongSlope = this.velocity.x * tangentX + this.velocity.y * tangentY;
        
        // 如果没有速度或速度很小，检查是否需要开始滑动
        if (Math.abs(velocityAlongSlope) < 0.1) {
            // 检查重力沿斜面的分力是否大于最大静摩擦力
            const maxStaticFriction = frictionCoefficient * perpendicularForce;
            
            if (parallelForce > maxStaticFriction) {
                // 开始滑动，给予一个小的初速度
                const slideDirection = parallelForce > 0 ? 1 : -1;
                this.velocity.x = tangentX * slideDirection * 0.5;
                this.velocity.y = tangentY * slideDirection * 0.5;
            } else {
                // 保持静止
                this.velocity = new Vector2(0, 0);
            }
            return;
        }
        
        // 滑动摩擦力：方向与速度方向相反
        const frictionForceMagnitude = frictionCoefficient * perpendicularForce;
        const frictionDirection = velocityAlongSlope > 0 ? -1 : 1;
        const frictionForce = frictionForceMagnitude * frictionDirection;
        
        // 总力：重力沿斜面分力 + 摩擦力
        const totalForceAlongSlope = parallelForce + frictionForce;
        const accelerationAlongSlope = totalForceAlongSlope / this.mass;
        
        // 更新速度
        const velocityChange = accelerationAlongSlope * dt;
        const newVelocityAlongSlope = velocityAlongSlope + velocityChange;
        
        // 如果速度反向，停止运动
        if (velocityAlongSlope * newVelocityAlongSlope <= 0) {
            this.velocity = new Vector2(0, 0);
        } else {
            this.velocity.x = tangentX * newVelocityAlongSlope;
            this.velocity.y = tangentY * newVelocityAlongSlope;
        }
    }
    
    isOnSurface() {
        // 这个方法已过时，保留兼容性
        // 现在通过getSupportingSurface检测支撑表面
        return false; // 默认返回false，实际检测在PhysicsEngine中处理
    }
    
    // 计算能量：接收 groundLevel 以便与画布/世界高度解耦
    calculateEnergy(gravity, groundLevel) {
        // 动能: 1/2 * m * v^2
        const speed = this.velocity.magnitude();
        this.kineticEnergy = 0.5 * this.mass * speed * speed;
        
        // 势能: m * g * h (以画布底部为参考)
        const ground = (typeof groundLevel === 'number') ? groundLevel : 600;
        const height = ground - (this.position.y + this.height);
        this.potentialEnergy = this.mass * gravity * height;
    }
    
    checkCollision(other) {
        // AABB碰撞检测
        return (this.position.x < other.position.x + other.width &&
                this.position.x + this.width > other.position.x &&
                this.position.y < other.position.y + other.height &&
                this.position.y + this.height > other.position.y);
    }
    
    resolveCollision(other) {
        // 确定哪个是静态物体，哪个是动态物体
        let staticObj = null;
        let dynamicObj = null;
        
        if (this.static && !other.static) {
            staticObj = this;
            dynamicObj = other;
        } else if (!this.static && other.static) {
            staticObj = other;
            dynamicObj = this;
        } else if (!this.static && !other.static) {
            // 两个都是动态物体，使用原来的逻辑
            // 计算碰撞法线
            const dx = (this.position.x + this.width/2) - (other.position.x + other.width/2);
            const dy = (this.position.y + this.height/2) - (other.position.y + other.height/2);
            
            // 质量比
            const totalMass = this.mass + other.mass;
            const massRatio1 = other.mass / totalMass;
            const massRatio2 = this.mass / totalMass;
            
            // 一维碰撞（简化）
            const combinedRestitution = Math.min(this.restitution, other.restitution);
            
            // 相对速度
            const relativeVelocity = this.velocity.subtract(other.velocity);
            
            // 速度更新（简化的一维碰撞响应）
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平碰撞
                const newVx1 = (this.velocity.x * (this.mass - other.mass) + 2 * other.mass * other.velocity.x) / totalMass;
                const newVx2 = (other.velocity.x * (other.mass - this.mass) + 2 * this.mass * this.velocity.x) / totalMass;
                
                this.velocity.x = newVx1 * combinedRestitution;
                other.velocity.x = newVx2 * combinedRestitution;
                
                // 分离物体
                const overlap = Math.min(this.position.x + this.width - other.position.x, 
                                        other.position.x + other.width - this.position.x) / 2;
                this.position.x -= overlap * massRatio1;
                other.position.x += overlap * massRatio2;
            } else {
                // 垂直碰撞
                const newVy1 = (this.velocity.y * (this.mass - other.mass) + 2 * other.mass * other.velocity.y) / totalMass;
                const newVy2 = (other.velocity.y * (other.mass - this.mass) + 2 * this.mass * this.velocity.y) / totalMass;
                
                this.velocity.y = newVy1 * combinedRestitution;
                other.velocity.y = newVy2 * combinedRestitution;
                
                // 分离物体
                const overlap = Math.min(this.position.y + this.height - other.position.y,
                                        other.position.y + other.height - this.position.y) / 2;
                this.position.y -= overlap * massRatio1;
                other.position.y += overlap * massRatio2;
            }
            return;
        } else {
            // 两个都是静态物体，不需要处理
            return;
        }
        
        // 处理静态物体与动态物体的碰撞
        const combinedRestitution = Math.min(dynamicObj.restitution, staticObj.restitution);
        
        // 计算碰撞法线（从静态物体指向动态物体）
        const dx = (dynamicObj.position.x + dynamicObj.width/2) - (staticObj.position.x + staticObj.width/2);
        const dy = (dynamicObj.position.y + dynamicObj.height/2) - (staticObj.position.y + staticObj.height/2);
        
        // 对于斜面，需要特殊处理
        if (staticObj.type === 'slope') {
            // 斜面碰撞处理
            this.resolveSlopeCollision(dynamicObj, staticObj, combinedRestitution);
            return;
        }
        
        // 对于普通静态物体（木板、地面）
        // 速度更新（简化：反弹）
        if (Math.abs(dx) > Math.abs(dy)) {
            // 主要是水平碰撞
            dynamicObj.velocity.x = -dynamicObj.velocity.x * combinedRestitution;
            
            // 分离物体
            if (dx > 0) {
                // 动态物体在静态物体右侧
                dynamicObj.position.x = staticObj.position.x + staticObj.width + 1;
            } else {
                // 动态物体在静态物体左侧
                dynamicObj.position.x = staticObj.position.x - dynamicObj.width - 1;
            }
        } else {
            // 主要是垂直碰撞
            dynamicObj.velocity.y = -dynamicObj.velocity.y * combinedRestitution;
            
            // 分离物体
            if (dy > 0) {
                // 动态物体在静态物体下方
                dynamicObj.position.y = staticObj.position.y + staticObj.height + 1;
            } else {
                // 动态物体在静态物体上方
                dynamicObj.position.y = staticObj.position.y - dynamicObj.height - 1;
            }
        }
    }
    
    resolveSlopeCollision(dynamicObj, slopeObj, restitution) {
        // 斜面碰撞处理
        // 计算斜面法线（垂直于斜面表面）
        const slopeAngle = slopeObj.slopeAngle;
        const normalX = -Math.sin(slopeAngle);
        const normalY = Math.cos(slopeAngle);
        
        // 计算速度在法线方向上的分量
        const velocityDotNormal = dynamicObj.velocity.x * normalX + dynamicObj.velocity.y * normalY;
        
        // 反射速度：v' = v - 2*(v·n)*n
        dynamicObj.velocity.x -= 2 * velocityDotNormal * normalX * restitution;
        dynamicObj.velocity.y -= 2 * velocityDotNormal * normalY * restitution;
        
        // 将物体放置在斜面表面上（避免穿透）
        // 简化：将物体放在斜面顶部附近
        const slopeTopY = slopeObj.position.y;
        const slopeRightX = slopeObj.position.x + slopeObj.width;
        const slopeBottomY = slopeObj.position.y + slopeObj.height;
        
        // 判断���体在斜面的哪一侧
        const objCenterX = dynamicObj.position.x + dynamicObj.width/2;
        const objCenterY = dynamicObj.position.y + dynamicObj.height/2;
        
        // 计算物体到斜面的距离
        const slopeLineY = slopeBottomY - (objCenterX - slopeObj.position.x) * (slopeObj.height / slopeObj.width);
        
        if (objCenterY > slopeLineY) {
            // 物体在斜面下方，需要推到斜面上方
            dynamicObj.position.y = slopeLineY - dynamicObj.height/2;
        }
    }
    
    containsPoint(point) {
        return (point.x >= this.position.x && 
                point.x <= this.position.x + this.width &&
                point.y >= this.position.y && 
                point.y <= this.position.y + this.height);
    }
}

class PhysicsEngine {
    constructor(options = {}) {
        this.objects = [];
        this.gravity = 9.8;
        this.frictionCoefficient = 0.2;
        this.timeScale = 1.0;
        this.isRunning = false;
        this.currentTime = 0;
        this.selectedObject = null;
        
        // 注入的画布/世界尺寸（默认保留原始硬编码值以向后兼容）
        this.canvasWidth = options.canvasWidth || 800;
        this.canvasHeight = options.canvasHeight || 600;
        this.groundLevel = (typeof options.groundLevel === 'number') ? options.groundLevel : this.canvasHeight;
        
        // 能量跟踪
        this.totalEnergy = 0;
        this.totalMomentum = new Vector2(0, 0);
        this.frictionLoss = 0;
        
        // 创建默认地面
        this.createDefaultFloor();
    }
    
    createDefaultFloor() {
        const floorHeight = 20;
        const floor = new PhysicsObject('floor', new Vector2(0, this.groundLevel - floorHeight), this.canvasWidth, floorHeight, {
            static: true,
            frictionCoefficient: 0.2
        });
        this.objects.push(floor);
    }
    
    addObject(type, position, width, height, options = {}) {
        console.log(`添加物体: ${type}, 位置(${position.x}, ${position.y}), 尺寸(${width}x${height}), 选项`, options);
        
        const obj = new PhysicsObject(type, position, width, height, options);
        this.objects.push(obj);
        
        console.log(`物体添加成功，当前物体总数: ${this.objects.length}`);
        return obj;
    }
    
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }
    
    clearObjects() {
        // 保留地面
        this.objects = this.objects.filter(obj => obj.type === 'floor');
    }
    
    update(dt) {
        if (!this.isRunning) return;
        
        const scaledDt = dt * this.timeScale;
        this.currentTime += scaledDt;
        
        // 重置总能量和动量
        this.totalEnergy = 0;
        this.totalMomentum = new Vector2(0, 0);
        
        // 首先检测和处理支撑表面
        for (const obj of this.objects) {
            if (obj.static) continue;
            
            // 检测支撑表面
            const supportingSurface = obj.getSupportingSurface(this);
            
            // 如果物体在支撑表面上，应用摩擦力
            if (supportingSurface) {
                obj.applyFrictionOnSurface(supportingSurface, 
                                          supportingSurface.frictionCoefficient || this.frictionCoefficient,
                                          scaledDt, this.gravity);
                
                // 确保物体不会穿透支撑表面
                this.preventPenetration(obj, supportingSurface);
            }
            
            // 更新物体状态（传入 groundLevel）
            obj.update(scaledDt, this.gravity, this.frictionCoefficient, this.groundLevel);
            
            // 累计总能量和动量
            this.totalEnergy += obj.kineticEnergy + obj.potentialEnergy;
            this.totalMomentum = this.totalMomentum.add(obj.velocity.multiply(obj.mass));
        }
        
        // 碰撞检测和响应
        this.handleCollisions();
        
        // 边界检查
        this.handleBoundaries();
    }
    
    preventPenetration(dynamicObj, staticObj) {
        // 防止动态物体穿透静态物体
        if (dynamicObj.checkCollision(staticObj)) {
            // 计算重叠区域
            const overlapX = Math.min(
                dynamicObj.position.x + dynamicObj.width - staticObj.position.x,
                staticObj.position.x + staticObj.width - dynamicObj.position.x
            );
            
            const overlapY = Math.min(
                dynamicObj.position.y + dynamicObj.height - staticObj.position.y,
                staticObj.position.y + staticObj.height - dynamicObj.position.y
            );
            
            // 在重叠最小的方向上将物体推开
            if (overlapX < overlapY) {
                // 水平方向推开
                if (dynamicObj.position.x < staticObj.position.x) {
                    dynamicObj.position.x = staticObj.position.x - dynamicObj.width - 0.1;
                } else {
                    dynamicObj.position.x = staticObj.position.x + staticObj.width + 0.1;
                }
                // 水平速度归零
                dynamicObj.velocity.x = 0;
            } else {
                // 垂直方向推开
                if (dynamicObj.position.y < staticObj.position.y) {
                    dynamicObj.position.y = staticObj.position.y - dynamicObj.height - 0.1;
                } else {
                    dynamicObj.position.y = staticObj.position.y + staticObj.height + 0.1;
                }
                // 垂直速度归零
                dynamicObj.velocity.y = 0;
            }
        }
    }
    
    handleCollisions() {
        // 简单的O(n²)碰撞检测（对于小规模仿真足够）
        for (let i = 0; i < this.objects.length; i++) {
            for (let j = i + 1; j < this.objects.length; j++) {
                const obj1 = this.objects[i];
                const obj2 = this.objects[j];
                
                if (obj1.checkCollision(obj2)) {
                    obj1.resolveCollision(obj2);
                    
                    // 计算摩擦损耗（简化）
                    const speedBefore1 = obj1.velocity.magnitude();
                    const speedBefore2 = obj2.velocity.magnitude();
                    
                    // 这里可以添加更精确的摩擦损耗计算
                }
            }
        }
    }
    
    handleBoundaries() {
        const canvasWidth = this.canvasWidth;
        const canvasHeight = this.canvasHeight;
        
        for (const obj of this.objects) {
            if (obj.static) continue;
            
            // 左右边界
            if (obj.position.x < 0) {
                obj.position.x = 0;
                obj.velocity.x = -obj.velocity.x * obj.restitution;
            } else if (obj.position.x + obj.width > canvasWidth) {
                obj.position.x = canvasWidth - obj.width;
                obj.velocity.x = -obj.velocity.x * obj.restitution;
            }
            
            // 上下边界
            if (obj.position.y < 0) {
                obj.position.y = 0;
                obj.velocity.y = -obj.velocity.y * obj.restitution;
            } else if (obj.position.y + obj.height > canvasHeight) {
                obj.position.y = canvasHeight - obj.height;
                obj.velocity.y = -obj.velocity.y * obj.restitution;
                
                // 在地面上施加摩擦
                this.frictionLoss += Math.abs(obj.velocity.x) * obj.mass * this.frictionCoefficient * 0.1;
            }
        }
    }
    
    selectObjectAt(point) {
        // 优先选择非静态物体
        for (const obj of this.objects) {
            if (!obj.static && obj.containsPoint(point)) {
                this.selectedObject = obj;
                obj.isSelected = true;
                return obj;
            }
        }
        
        // 如果没有找到非静态物体，选择任何物体
        for (const obj of this.objects) {
            if (obj.containsPoint(point)) {
                this.selectedObject = obj;
                obj.isSelected = true;
                return obj;
            }
        }
        
        return null;
    }
    
    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.isSelected = false;
            this.selectedObject = null;
        }
    }
    
    applyForceToSelected(force) {
        if (this.selectedObject && !this.selectedObject.static) {
            this.selectedObject.applyForce(force);
            return true;
        }
        return false;
    }
    
    setInitialVelocity(object, velocity) {
        if (object && !object.static) {
            object.velocity = velocity;
        }
    }
    
    getPhysicsInfo() {
        let totalKineticEnergy = 0;
        let totalPotentialEnergy = 0;
        let totalMomentumX = 0;
        let totalMomentumY = 0;
        
        for (const obj of this.objects) {
            if (!obj.static) {
                totalKineticEnergy += obj.kineticEnergy;
                totalPotentialEnergy += obj.potentialEnergy;
                totalMomentumX += obj.velocity.x * obj.mass;
                totalMomentumY += obj.velocity.y * obj.mass;
            }
        }
        
        return {
            time: this.currentTime,
            totalEnergy: totalKineticEnergy + totalPotentialEnergy,
            kineticEnergy: totalKineticEnergy,
            potentialEnergy: totalPotentialEnergy,
            momentum: new Vector2(totalMomentumX, totalMomentumY),
            frictionLoss: this.frictionLoss,
            objectCount: this.objects.filter(obj => !obj.static).length
        };
    }
    
    start() {
        this.isRunning = true;
    }
    
    pause() {
        this.isRunning = false;
    }
    
    reset() {
        this.isRunning = false;
        this.currentTime = 0;
        this.frictionLoss = 0;
        
        // 重置所有动态物体到初始状态
        for (const obj of this.objects) {
            if (!obj.static) {
                obj.velocity = new Vector2(0, 0);
                obj.acceleration = new Vector2(0, 0);
                obj.forces = new Vector2(0, 0);
                obj.kineticEnergy = 0;
                obj.potentialEnergy = 0;
            }
        }
    }
}

// 导出供其他模块使用
window.Vector2 = Vector2;
window.PhysicsObject = PhysicsObject;
window.PhysicsEngine = PhysicsEngine;
