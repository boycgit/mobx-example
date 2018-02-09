var bankUser = mobx.observable({
  a: 3,
  b: 2,
  get divisor() {
    return this.a / this.b; // 计算除数
  }
});
mobx.autorun(() => {
  console.log('view:', bankUser.a);
});

// console.log('==========', bankUser.divisor);
// bankUser.a = 4;
