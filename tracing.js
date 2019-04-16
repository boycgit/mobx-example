var colors = tinygradient('#00E5E3', '#0008BF')
  .hsv(10)
  .map(o => o.toHexString());
var ConsoleStyles = colors.map((color, index) => {
  var fontColor = index > 2 ? '#f9f9f9' : 'black';
  return `color:${fontColor};background-color:${color};font-weight:bold;`;
});

var colorLog = function(...msgs) {
  console.log(`%c${msgs.join('')}`, 'color:white;background-color:#BB5561;');
};

function getStyles(depth) {
  var len = ConsoleStyles.length;
  if (depth > len - 1) {
    console.warn(`depth(${depth} 超过 ConsoleStyles 的长度{${len}})`);
  }
  return ConsoleStyles[Math.min(depth, len - 1)];
}

/*! Tracing.js v1.2.0. | (c) 2013 Francisco Soto <ebobby@ebobby.org> | See COPYING file for more info. */

var Tracing = (function() {
  /////////////////////////////////////////////////////////////////////////////////////////////
  //// Global state
  /////////////////////////////////////////////////////////////////////////////////////////////

  var Traces = {};
  var globalObject = Function('return this')();
  //   var globalObject = {}; // 用于存放全局变量
  var traceDepth = 0;

  /**
   * Do nothing function.
   */
  function noop() {}

  /////////////////////////////////////////////////////////////////////////////////////////////
  //// Predicates
  /////////////////////////////////////////////////////////////////////////////////////////////

  function isFunc(obj) {
    return typeof obj === 'function';
  }

  function isTraced(fnName) {
    return Traces[fnName] != null && Traces[fnName] != undefined;
  }

  function isString(obj) {
    return typeof obj === 'string';
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //// Helpers
  /////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Stringify function to be used as a replacer function for JSON.stringify.
   * The output of this function is to be used for object display only, it cannot be parsed back into an object.
   *
   * @param {String}   key   key of the value in the object.
   * @param {Object}   value the value of the key
   * @return {Object}  stringified version of the value.
   */
  function stringify(key, value) {
    if (value !== value) {
      return 'NaN';
    }

    if (typeof value == 'function') {
      return value.toString();
    }

    return value;
  }

  /**
   * Pretty print the given object.
   *
   * @param {Object} obj the value to pretty print.
   * @return {String} a string representation of the given object.
   */
  function prettyPrint(obj) {
    return JSON.stringify(obj, stringify);
  }

  /**
   * Converts an arguments object into an array.
   *
   * @param {Arguments} args arguments object
   * @return {Array} converted array
   */
  function arguments2array(args) {
    return Array.prototype.slice.call(args);
  }

  /**
   * Iterates through the own object properties calling the given function.
   *
   * @param {Object} obj the object we are iterating
   * @param {Function} fn the function to call
   * @return {Object} the object with the properties iterated through. (not a copy)
   */
  function withProperties(obj, fn) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        fn(key, obj[key]);
      }
    }
    return obj;
  }

  /**
   * Makes a copy of the given object. Only owned properties.
   *
   * @param {Object} src source object
   * @param {Object} dst destination object.
   * @return {Object} same object as dst.
   */
  function copyOwnProperties(src, dst) {
    withProperties(src, function(key, val) {
      dst[key] = val;
    });
    return dst;
  }

  /**
   * Traverses the object defined by the string target, if val is passed
   * we set last object value to this value, the value of the object is returned.
   * 可以认为是 target = val 赋值语句的升级版；
   *  - 如有 val ，相当于 set 操作
   *  - 如无 val，相当于 get 操作
   * @param {String} target the fully qualified name of the object. Ej: "window.document".
   * @param {Object} val (optional) if passed, the object will be set to this value.
   * @return {Object} the value of the object. 如果没有意外，其实就是入参 val 的值；
   */
  function objectTraverser(target, val) {
    var elements = target.split('.'),
      curElement = globalObject;

    for (var i = 0; i < elements.length; i++) {
      if (!(elements[i] in curElement)) {
        throw 'Property ' + elements.slice(0, i + 1).join('.') + ' not found!';
      }

      // If we are setting the value...
      // 如果递归到最后一个参数，则更新指定的值
      if (arguments.length > 1 && i == elements.length - 1) {
        curElement[elements[i]] = val;
      }

      curElement = curElement[elements[i]];
    }

    return curElement;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //// Default tracing functions
  /////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Prints the function name and the arguments passed to it with proper depth indentation.
   *
   * @param {String} fnName function name.
   * @param {Array}  parameters function parameters.参数列表，（如果参数列表中某一项是函数，则会以函数名来代替）
   * @param {Number} depth the depth of the traced calls.
   */
  function traceBefore(fnName, parameters, depth) {
    parameters = parameters.map(prettyPrint);
    console.log(
      '%c>' +
      new Array(depth + 1).join('  ') + // indentation
        fnName +
        ' called with arguments: (' +
        parameters.join(', ') +
        ')',
      getStyles(depth)
    ); // parameters
  }

  /**
   * Prints the function name and the value returned by it with proper depth indentation.
   * @param {String} fnName function name.
   * @param {Object} returnVal returned value.
   * @param {Number} depth the depth of the traced calls.
   */
  function traceAfter(fnName, returnVal, depth) {
    console.log(
      '%c>' +
      new Array(depth + 1).join('  ') + // indentation
        fnName +
        ' returned: ' +
        prettyPrint(returnVal),
      getStyles(depth)
    ); // return value
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //// Tracing fun
  /////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Sets a trace on the fully qualified function name.
   *
   * @param {String} fnName fully qualified function name. Ej: "Array.prototype.slice".
   */
  function setTrace(fnName) {
    //   通过从全局对象 globalObject 中获取目标对象
    var target = objectTraverser(fnName);
    if (!isFunc(target)) {
      throw 'Not a valid function to trace!';
    }

    if (isTraced(fnName)) {
      throw 'This function is already being traced!';
    }

    Traces[fnName] = {
      //   trace: noop,
      original: target,
      before: noop,
      after: noop
    };
    // 核心代码
    var trace = function() {
      var retval,
        env = Traces[fnName];

      traceDepth++;

      env.before.call(this, fnName, arguments2array(arguments), traceDepth);
      retval = env.original.apply(this, arguments); // 执行原始的方法
      env.after.call(this, fnName, retval, traceDepth);

      traceDepth--;

      return retval;
    };

    // Traces[fnName].trace = trace;

    // Sometimes functions have stuff attached to them, like jQuery's $.
    // 将 target 上的属性拷贝给 trace 函数，相当于 trace 是 target 的子类
    copyOwnProperties(target, trace);

    // Sometimes we want to trace constructors, gotta keep their prototype.
    // 原型继承
    trace.prototype = target.prototype;

    // Change the function to our own.
    // 将全局变量上的 fnName 替换成我们的 trace 对象，完成 “狸猫换太子” 的操作
    // 同时原来的 target 对象已经保存在 Traces.original 属性中，方便后续重新操作
    objectTraverser(fnName, trace);
  }

  /**
   * Removes a trace on the fully qualified function name.
   * 相当于 setTrace 的逆向操作
   * @param {String} fnName fully qualified function name. Ej: "Array.prototype.slice".
   */
  function unsetTrace(fnName) {
    if (!isString(fnName)) {
      throw 'The function name should be a string.';
    }

    if (!isTraced(fnName)) {
      throw 'This function is not being traced!';
    }

    var tracingFunc = objectTraverser(fnName),
      env = Traces[fnName];

    // If code added properties to the tracing function believing it was the original we need to keep them.
    copyOwnProperties(tracingFunc, env.original);

    // If code modified the prototype we better keep that as well.
    env.original.prototype = tracingFunc.prototype;

    // Unset the trace.
    objectTraverser(fnName, env.original);

    // Remove the function from our internal data structure.
    delete Traces[fnName];
  }

  /**
   * Sets a trace on the fully qualified function name, also verifies the passed function,
   * if invalid or not set it returns an empty function.
   * 该方法有两个作用：
   *   1. 检查 fnName 的合法性，同时将 fnName 全局函数替换成 Trace 对象武装过的函数；
   *   2. 检查 fn 是否是合法函数对象
   * @param {String} fnName fully qualified function name.
   * @param {Function} fn (optional) function, it is simply returned if set, if not noop is returned.
   * @return {Function} fn if set, empty function otherwise.
   */
  function preprocess(fnName, fn) {
    if (!isString(fnName)) {
      throw 'The function name should be a string.';
    }

    if (!isTraced(fnName)) {
      setTrace(fnName);
    }

    return isFunc(fn) ? fn : noop;
  }

  /**
   * Hooks a before event on the given function.
   *
   * @param {String} fnName fully qualified function to set this event to.
   * @param (Function) fn function to call *before* fnName is called.
   */
  function setBefore(fnNameOrObj, fn) {
    var isObj = isFunc(fnNameOrObj);
    var fnName = isObj ? `${fnNameOrObj.name}` : fnNameOrObj;
    // 如果是对象，则重新创建一个虚拟对象挂载到 globalObject 上
    if (isObj) {
      //   if (!globalObject.mockup) {
      //     globalObject.mockup = {};
      //   }
      globalObject[fnName] = fnNameOrObj;
    }
    var before = preprocess(fnName, fn);
    Traces[fnName].before = before;
    return globalObject[fnName];
  }

  /**
   * Hooks an after event on the given function.
   *
   * @param {String} fnName fully qualified function to set this event to.
   * @param (Function) fn function to call *after* fnName is called.
   */
  function setAfter(fnNameOrObj, fn) {
    var isObj = isFunc(fnNameOrObj);
    var fnName = isObj ? `${fnNameOrObj.name}` : fnNameOrObj;
    // 如果是对象，则重新创建一个虚拟对象挂载到 globalObject 上
    if (isObj) {
      //   if (!globalObject.mockup) {
      //     globalObject.mockup = {};
      //   }
      globalObject[fnName] = fnNameOrObj;
    }
    var after = preprocess(fnName, fn);
    Traces[fnName].after = after;
    return globalObject[fnName];
  }

  // Tracing.js interface
  var tracingjs = {
    trace: function(fnName) {
      var result = null;
      for (var i = 0; i < arguments.length; i++) {
        setBefore(arguments[i], traceBefore);
        setAfter(arguments[i], traceAfter);
      }
    },

    before: function(fnName, fn) {
      return setBefore(fnName, fn);
    },

    after: function(fnName, fn) {
      return setAfter(fnName, fn);
    },

    untrace: function(fnName) {
      if (arguments.length > 0) {
        for (var i = 0; i < arguments.length; i++) {
          unsetTrace(arguments[i]);
        }
      } else {
        // If no function name given, remove all traces.
        withProperties(Traces, unsetTrace);
      }
    }
  };

  // Wrap Tracing.js functions with another function that allows it to return itself.
  return function wrap() {
    var self = this;

    return withProperties(self, function(key, val) {
      if (isFunc(val)) {
        self[key] = function() {
          // We are disregarding the original function return value, but that's ok here.
          var args = arguments2array(arguments);

          if (isFunc(args[0]) && (key === 'before' || key === 'after')) {
            return val.apply(self, args);
          } else {
            val.apply(self, args);
            return self;
          }

          //   return self;
        };
      }
    });
  }.call(tracingjs);
})();
