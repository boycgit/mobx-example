var bankUser = mobx.observable({
  income: 3,
  debit: 2,
  get divisor() {
    return this.income / this.debit; // 计算除数
  }
});
mobx.autorun(() => {
  colorLog('bankUser.income: ', bankUser.income);
});

// console.log('==========', bankUser.divisor);
