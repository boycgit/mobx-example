
var bankUser = mobx.observable({
	name: '张三',
	age: 20,
	income: 1000, // 收入
	expend: 50, // 支出
	loan: 200, // 贷款（信用卡）
	get balance() {
		return this.income - this.expend - this.loan; // 计算账户余额
	},
	get isVip() {
		return this.income - this.expend > 3 * this.loan; // 能够足够偿还贷款
	},

	// 努力工作
	hardwork: mobx.action(function hardwork(money=100) {
		this.income += money;
	}),

	// 消费
	consume: mobx.action(function consume(money=50) {
		this.expend += money;
	}),

	// 借贷
	debit: mobx.action(function debit(money=20) {
		this.loan += money;
	}),

	// 偿还贷款
	repay: mobx.action(function repay(money=20) {
		this.loan -= money;
	})
});

/* ----------------------------------------------------
    规则定义
----------------------------------------------------- */
// 每次消费之后都会进行一次计算
mobx.autorun(function display () {
	console.log(`name: ${bankUser.name}, blance: ${bankUser.balance}, loan: ${bankUser.loan}, isVip: ${bankUser.isVip}`);
});

// 第三方机构（房地产商）获取用户信息
var estatesCall = mobx.computed(()=>{
	return bankUser.isVip;
});

mobx.autorun(function callUser() {
	console.log(`${estatesCall.get() ? '要给': '不用给'}用户打电话促销`);
});


/* ----------------------------------------------------
    行为
----------------------------------------------------- */
bankUser.debit(1000);



