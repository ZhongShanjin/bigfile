// 延迟函数
const delay = function delay(interval) {
  typeof interval !== "number" ? (interval = 1000) : null;
  return new Promise((resolve) => {
    // 使用setTimeout设置一个定时器，当定时器结束后，调用resolve()方法
    setTimeout(() => {
      // 当Promise内部调用resolve时，这个Promise就会被解决（fulfilled）
      resolve();
    }, interval);
  });
};

/* 基于FORM-DATA实现文件上传 */
/* FormData是一种用于模拟表单数据的编码方式，可以异步上传文件。在使用XMLHttpRequest或fetch等API时，经常使用FormData来上传文件。
优点：
直接支持：浏览器原生支持FormData，无需额外的转换操作。
性能：上传大文件时比Base64更高效，因为不需要将文件内容转换为字符串。
多用途：可以与其他类型的表单数据一同发送。
无文件大小限制：理论上没有大小限制，适合上传大型文件。
进度监控：可以使用XHR的progress事件来监控上传进度。
缺点：
兼容性：旧版浏览器可能不支持FormData或需要使用polyfill。
二进制数据：由于是二进制传输，如果中间需要对文件内容进行处理，可能会比较复杂。*/
(function () {
  let upload = document.querySelector("#upload1"),
    upload_inp = upload.querySelector(".upload_inp"),
    // upload元素内部第一个同时拥有upload_button和select类的元素
    // querySelector并不限制层级，只要满足选择器条件的第一个元素都会被选择。
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_button_upload = upload.querySelector(".upload_button.upload"),
    upload_tip = upload.querySelector(".upload_tip"),
    upload_list = upload.querySelector(".upload_list");
  let _file = null;

  // 上传文件到服务器，上传时加上disable和loading，结束时去除
  const changeDisable = (flag) => {
    if (flag) {
      upload_button_select.classList.add("disable");
      upload_button_upload.classList.add("loading");
      return;
    }
    upload_button_select.classList.remove("disable");
    upload_button_upload.classList.remove("loading");
  };
  //点击上传按钮
  upload_button_upload.addEventListener("click", function () {
    if (
      upload_button_upload.classList.contains("disable") ||
      upload_button_upload.classList.contains("loading")
    )
      return; //上传时不能点击
    if (!_file) {
      alert("请您先选择要上传的文件~~");
      return;
    }
    changeDisable(true); //上传时加disable和loading
    // 把文件传递给服务器：FormData / BASE64
    let formData = new FormData();
    formData.append("file", _file);
    formData.append("filename", _file.name);
    instance
      .post("/upload_single", formData)
      .then((data) => {
        if (+data.code === 0) {
          alert(
            `文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`
          );
          return;
        }
        return Promise.reject(data.codeText); //失败时返回
      })
      .catch((reason) => {
        alert("文件上传失败，请您稍后再试~~");
      })
      .finally(() => {
        clearHandle();
        changeDisable(false); //去除disable和loading
        upload_inp.value = ""; // 清空input的值，即file
      });
  });

  // 移除按钮的点击处理
  const clearHandle = () => {
    _file = null;
    upload_tip.style.display = "block";
    upload_list.style.display = "none";
    upload_list.innerHTML = ``;
  };

  //监听移除按钮点击事件
  upload_list.addEventListener("click", function (ev) {
    let target = ev.target;
    if (target.tagName === "EM") {
      // 点击的是移除按钮
      clearHandle();
    }
  });

  // 监听用户选择文件的操作
  upload_inp.addEventListener("change", function () {
    // 获取用户选中的文件对象
    //   + name：文件名
    //   + size：文件大小 B
    //   + type：文件的MIME类型
    let file = upload_inp.files[0];
    if (!file) return;

    // 限制文件上传的格式「方案一」
    /* if (!/(PNG|JPG|JPEG)/i.test(file.type)) {
            alert('上传的文件只能是 PNG/JPG/JPEG 格式的~~');
            return;
        } */

    // 限制文件上传的大小
    if (file.size > 2 * 1024 * 1024) {
      alert("上传的文件不能超过2MB~~");
      return;
    }

    _file = file;

    // 显示上传的文件
    upload_tip.style.display = "none";
    upload_list.style.display = "block";
    upload_list.innerHTML = `<li>
            <span>文件：${file.name}</span>
            <span><em>移除</em></span>
        </li>`;
  });

  // 点击选择文件按钮，触发上传文件INPUT框选择文件的行为
  upload_button_select.addEventListener("click", function () {
    if (
      upload_button_select.classList.contains("disable") ||
      upload_button_select.classList.contains("loading")
    )
      return;
    upload_inp.click();
  });
})();

/* 基于BASE64实现文件上传 */
/* Base64上传
Base64是一种编码方式，可以将二进制数据转换为ASCII字符串。通常用于在不支持二进制的场合传输数据。
优点：
兼容性：几乎所有的环境都支持Base64编码，包括旧的浏览器。
简单文本：因为是字符串，所以可以轻松地将Base64编码后的字符串嵌入到JSON或其他文本中。
不受表单限制：可以在不使用表单的情况下发送文件数据。
缺点：
文件大小：编码后的大小约为原始数据的4/3，增加了传输负担。
性能开销：编码和解码过程需要时间，特别是在文件较大时。
不适合大文件：对于非常大的文件，Base64编码会消耗大量内存和带宽。
进度监控：不能像FormData那样监控上传进度。*/
(function () {
  let upload = document.querySelector("#upload2"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select");

  // 验证是否处于可操作性状态,不可用返回true
  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  // 把选择的文件读取成为BASE64
  const changeBASE64 = (file) => {
    return new Promise((resolve) => {
      let fileReader = new FileReader(); //Web API的一部分，用于异步读取用户计算机上的文件内容。
      fileReader.readAsDataURL(file); //将传入的文件 file 读取为数据URL。这个方法读取完成后，文件内容会被转换为一个Base64编码的字符串，这个字符串在前面带有数据类型（如data:image/jpeg;base64,）。
      //这行代码设置了 fileReader 的 onload 事件处理程序。当 readAsDataURL 方法完成文件的读取后，会触发 onload 事件，此时执行这个事件处理函数。
      fileReader.onload = (ev) => {
        //传入了事件对象 ev 的 target.result 属性。这个属性包含了读取的文件数据（Base64编码字符串）
        resolve(ev.target.result);
      };
    });
  };

  upload_inp.addEventListener("change", async function () {
    let file = upload_inp.files[0],
      BASE64;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("上传的文件不能超过2MB~~");
      return;
    }
    upload_button_select.classList.add("loading");
    BASE64 = await changeBASE64(file);
    instance
      .post(
        "/upload_single_base64",
        {
          /*将 BASE64 字符串进行URL编码。URL编码是为了确保在HTTP请求中传输时不会出现格式和编码错误。因为直接在URL中使用Base64字符串可能会引起问题，比如Base64编码中的+、/和=字符在URL中有特殊含义，所以需要进行编码。*/
          file: encodeURIComponent(BASE64),
          filename: file.name,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then((data) => {
        if (+data.code === 0) {
          alert(
            `恭喜您，文件上传成功，您可以基于 ${data.servicePath} 地址去访问~~`
          );
          return;
        }
        throw data.codeText;
      })
      .catch((err) => {
        alert("很遗憾，文件上传失败，请您稍后再试~~");
      })
      .finally(() => {
        upload_button_select.classList.remove("loading");
        upload_inp.value = ""; // 清空input的值，即file
      });
  });

  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });
})();

/* 文件缩略图 & 自动生成名字 */
(function () {
  let upload = document.querySelector("#upload3"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_button_upload = upload.querySelector(".upload_button.upload"),
    upload_abbre = upload.querySelector(".upload_abbre"),
    upload_abbre_img = upload_abbre.querySelector("img");
  let _file = null;

  // 验证是否处于可操作性状态
  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  // 把选择的文件读取成为BASE64
  const changeBASE64 = (file) => {
    return new Promise((resolve) => {
      let fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = (ev) => {
        resolve(ev.target.result);
      };
    });
  };
  const changeBuffer = (file) => {
    return new Promise((resolve) => {
      let fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file); //读取文件内容并将其以二进制缓冲区（ArrayBuffer）的形式进行处理。file 本身的格式或类型不会改变，但它的内容会被读取并转换为 ArrayBuffer。在调用 readAsArrayBuffer 之后，文件的内容以二进制格式存在于 ArrayBuffer 中。这意味着你现在有了文件内容的低级表示，可以用于多种应用，比如：处理和分析文件数据：比如音频、视频或图片文件，可以解析其原始二进制数据进行处理。传输二进制数据：比如通过 WebSocket 发送数据。使用二进制操作：对数据进行切片、合并、修改等操作。
      //处理从 <input type="file"> 控件或通过 HTTP 请求获得的二进制文件时，文件数据通常以 ArrayBuffer 的形式存在。使用 SparkMD5.ArrayBuffer() 可以直接对这些数据计算 MD5 哈希值。
      fileReader.onload = (ev) => {
        let buffer = ev.target.result,
          spark = new SparkMD5.ArrayBuffer(),
          HASH,
          suffix;
        // 将 ArrayBuffer 数据添加到实例中
        spark.append(buffer);
        // 计算 MD5 哈希值
        HASH = spark.end();
        suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
        resolve({
          buffer,
          HASH,
          suffix,
          filename: `${HASH}.${suffix}`,
        });
      };
    });
  };

  // 把文件上传到服务器
  const changeDisable = (flag) => {
    if (flag) {
      upload_button_select.classList.add("disable");
      upload_button_upload.classList.add("loading");
      return;
    }
    upload_button_select.classList.remove("disable");
    upload_button_upload.classList.remove("loading");
  };
  upload_button_upload.addEventListener("click", async function () {
    if (checkIsDisable(this)) return;
    if (!_file) {
      alert("请您先选择要上传的文件~~");
      return;
    }
    changeDisable(true);
    // 生成文件的HASH名字
    let { filename } = await changeBuffer(_file);
    let formData = new FormData();
    formData.append("file", _file);
    formData.append("filename", filename);
    instance
      .post("/upload_single_name", formData)
      .then((data) => {
        if (+data.code === 0) {
          alert(
            `文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`
          );
          return;
        }
        return Promise.reject(data.codeText);
      })
      .catch((reason) => {
        alert("文件上传失败，请您稍后再试~~");
      })
      .finally(() => {
        changeDisable(false);
        upload_abbre.style.display = "none";
        upload_abbre_img.src = "";
        _file = null;
        upload_inp.value = ""; // 清空input的值，即file
      });
  });

  // 文件预览，就是把文件对象转换为BASE64，赋值给图片的SRC属性即可
  upload_inp.addEventListener("change", async function () {
    let file = upload_inp.files[0],
      BASE64;
    if (!file) return;
    _file = file;
    upload_button_select.classList.add("disable");
    BASE64 = await changeBASE64(file);
    upload_abbre.style.display = "block";
    //浏览器接收到带有 Base64 编码数据的 img 标签后，会自动解码 Base64 字符串，将其转换回原始的二进制格式，并渲染显示图片。这种方法无需进行额外的HTTP请求来获取图片文件，因此可以减少加载时间，常用于小图片或动态生成的图片数据的传输。
    upload_abbre_img.src = BASE64;
    upload_button_select.classList.remove("disable");
  });
  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });
})();

/* 进度管控 */
(function () {
  let upload = document.querySelector("#upload4"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_progress = upload.querySelector(".upload_progress"),
    upload_progress_value = upload_progress.querySelector(".value");

  // 验证是否处于可操作性状态
  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  upload_inp.addEventListener("change", async function () {
    let file = upload_inp.files[0],
      data;
    if (!file) return;
    upload_button_select.classList.add("loading");
    try {
      let formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
      data = await instance.post("/upload_single", formData, {
        // 文件上传中的回调函数 xhr.upload.onprogress
        onUploadProgress(ev) {
          let { loaded, total } = ev;
          upload_progress.style.display = "block";
          upload_progress_value.style.width = `${(loaded / total) * 100}%`;
        },
      });
      if (+data.code === 0) {
        upload_progress_value.style.width = `100%`;
        await delay(300);
        alert(
          `恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`
        );
        return;
      }
      throw data.codeText;
    } catch (err) {
      alert("很遗憾，文件上传失败，请您稍后再试~~");
    } finally {
      upload_button_select.classList.remove("loading");
      upload_progress.style.display = "none";
      upload_progress_value.style.width = `0%`;
      upload_inp.value = ""; // 清空input的值，即file
    }
  });

  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });
})();

/* 多文件上传 */
(function () {
  let upload = document.querySelector("#upload5"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_button_upload = upload.querySelector(".upload_button.upload"),
    upload_list = upload.querySelector(".upload_list");
  let _files = [];

  // 验证是否处于可操作性状态
  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  // 把文件上传到服务器
  const changeDisable = (flag) => {
    if (flag) {
      upload_button_select.classList.add("disable");
      upload_button_upload.classList.add("loading");
      return;
    }
    upload_button_select.classList.remove("disable");
    upload_button_upload.classList.remove("loading");
  };
  upload_button_upload.addEventListener("click", async function () {
    if (checkIsDisable(this)) return;
    if (_files.length === 0) {
      alert("请您先选择要上传的文件~~");
      return;
    }
    changeDisable(true);
    // 循环发送请求
    let upload_list_arr = Array.from(upload_list.querySelectorAll("li"));
    _files = _files.map((item) => {
      let fm = new FormData(),
        curLi = upload_list_arr.find(
          (liBox) => liBox.getAttribute("key") === item.key
        ),
        curSpan = curLi ? curLi.querySelector("span:nth-last-child(1)") : null;
      fm.append("file", item.file);
      fm.append("filename", item.filename);
      return instance
        .post("/upload_single", fm, {
          onUploadProgress(ev) {
            // 检测每一个的上传进度
            if (curSpan) {
              curSpan.innerHTML = `${((ev.loaded / ev.total) * 100).toFixed(
                2
              )}%`;
            }
          },
        })
        .then((data) => {
          if (+data.code === 0) {
            if (curSpan) {
              curSpan.innerHTML = `100%`;
            }
            return;
          }
          return Promise.reject();
        });
    });

    // 等待所有处理的结果
    Promise.all(_files)
      .then(async () => {
        await delay(300);
        alert("恭喜您，所有文件都上传成功~~");
      })
      .catch(() => {
        alert("很遗憾，上传过程中出现问题，请您稍后再试~~");
      })
      .finally(() => {
        changeDisable(false);
        _files = [];
        upload_list.innerHTML = "";
        upload_list.style.display = "none";
        upload_inp.value = ""; // 清空input的值，即file
      });
  });

  // 基于事件委托实现移除的操作
  upload_list.addEventListener("click", function (ev) {
    let target = ev.target,
      curLi = null,
      key;
    if (target.tagName === "EM") {
      curLi = target.parentNode.parentNode;
      if (!curLi) return;
      upload_list.removeChild(curLi);
      key = curLi.getAttribute("key");
      _files = _files.filter((item) => item.key !== key);
      if (_files.length === 0) {
        upload_list.style.display = "none";
      }
    }
  });

  // 获取唯一值
  const createRandom = () => {
    let ran = Math.random() * new Date(); //Math.random()返回值范围是从 0（包括）到 1（不包括）的浮点数,1* new Date()这种数值通常是一个表示自 1970 年 1 月 1 日 00:00:00 UTC 至当前日期时间的毫秒数。这个数值也称为 Unix 时间戳，或者更准确地说，是 Unix 毫秒时间戳
    return ran.toString(16).replace(".", "");
    //转换为没有小数点的十六进制字符串表示。
  };
  upload_inp.addEventListener("change", async function () {
    _files = Array.from(upload_inp.files);
    if (_files.length === 0) return;
    // 我们重构集合的数据结构「给每一项设置一个位置值，作为自定义属性存储到元素上，后期点击删除按钮的时候，我们基于这个自定义属性获取唯一值，再到集合中根据这个唯一值，删除集合中这一项」
    _files = _files.map((file) => {
      return {
        file,
        filename: file.name,
        key: createRandom(),
      };
    });
    // 绑定数据
    let str = ``;
    _files.forEach((item, index) => {
      str += `<li key="${item.key}">
                <span>文件${index + 1}：${item.filename}</span>
                <span><em>移除</em></span>
            </li>`;
    });
    upload_list.innerHTML = str;
    upload_list.style.display = "block";
  });

  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });
})();

/* 拖拽上传 */
(function () {
  let upload = document.querySelector("#upload6"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_submit = upload.querySelector(".upload_submit"),
    upload_mark = upload.querySelector(".upload_mark");
  let isRun = false;

  // 实现文件上传
  const uploadFile = async (file) => {
    if (isRun) return;
    isRun = true;
    upload_mark.style.display = "block";
    try {
      let fm = new FormData(),
        data;
      fm.append("file", file);
      fm.append("filename", file.name);
      data = await instance.post("/upload_single", fm);
      if (+data.code === 0) {
        alert(
          `恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`
        );
        return;
      }
      throw data.codeText;
    } catch (err) {
      alert(`很遗憾，文件上传失败，请您稍后再试~~`);
    } finally {
      upload_inp.value = ""; // 清空input的值，即file
      upload_mark.style.display = "none";
      isRun = false;
    }
  };

  // 拖拽获取 dragenter dragleave dragover drop
  /* upload.addEventListener('dragenter', function () {
    //当拖拽的元素进入到另一个元素的有效拖拽目标区域时触发。
        console.log('进入');
    });
    upload.addEventListener('dragleave', function () {
      //当拖拽的元素离开一个元素的有效拖拽目标区域时触发。
        console.log('离开');
    }); */
  upload.addEventListener("dragover", function (ev) {
    //dragover:当一个元素被拖拽到另一个元素上时持续触发。对于拖拽放置（drop）的元素来说，必须取消这个事件的默认行为（通常是通过 event.preventDefault()），以使放置（drop）事件能够发生。
    //默认行为：阻止任何放置操作。在 dragover 事件中调用 event.preventDefault() 是告诉浏览器“这个区域是可以接受被拖拽元素的放置的”。
    ev.preventDefault();
  });
  upload.addEventListener("drop", function (ev) {
    //当元素被拖拽到一个有效的拖拽目标并释放时触发。这个事件通常用来处理被拖拽数据的接收。默认行为：打开拖拽的文件或链接，或者是其他默认的响应操作。
    //调用 drop 事件的 event.preventDefault() 是为了阻止浏览器按照默认方式处理拖拽的数据（如打开链接或文件）。
    ev.preventDefault();
    //从拖拽事件的 dataTransfer 对象中获取的文件。
    let file = ev.dataTransfer.files[0];
    if (!file) return;
    uploadFile(file);
  });

  // 手动选择
  upload_inp.addEventListener("change", function () {
    let file = upload_inp.files[0];
    if (!file) return;
    uploadFile(file);
  });
  upload_submit.addEventListener("click", function () {
    upload_inp.click();
  });
})();

/* 大文件上传 */
(function () {
  let upload = document.querySelector("#upload7"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_progress = upload.querySelector(".upload_progress"),
    upload_progress_value = upload_progress.querySelector(".value");

  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  const changeBuffer = (file) => {
    return new Promise((resolve) => {
      let fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = (ev) => {
        let buffer = ev.target.result,
          spark = new SparkMD5.ArrayBuffer(),
          HASH,
          suffix;
        spark.append(buffer);
        HASH = spark.end();
        suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
        resolve({
          buffer,
          HASH,
          suffix,
          filename: `${HASH}.${suffix}`,
        });
      };
    });
  };

  upload_inp.addEventListener("change", async function () {
    let file = upload_inp.files[0];
    if (!file) return;
    upload_button_select.classList.add("loading");
    upload_progress.style.display = "block";

    // 获取文件的HASH
    let already = [],
      data = null,
      { HASH, suffix } = await changeBuffer(file);

    // 获取已经上传的切片信息
    try {
      data = await instance.get("/upload_already", {
        params: {
          HASH,
        },
      });
      if (+data.code == 0) {
        already = data.fileList;
        console.log(data.fileList);
      }
    } catch (err) {}

    // 实现文件切片处理 「固定数量 & 固定大小」
    let max = 1024 * 100, //设置每个文件块的最大大小为 100 KB
      count = Math.ceil(file.size / max), // 计算需要多少个块才能覆盖整个文件
      index = 0, // 当前处理的块的索引
      chunks = []; // 存储文件块信息的数组
    if (count > 100) {
      max = file.size / 100;
      count = 100;
    }
    while (index < count) {
      chunks.push({
        file: file.slice(index * max, (index + 1) * max),
        filename: `${HASH}_${index + 1}.${suffix}`,
      });
      index++;
    }

    // 上传成功的处理
    index = 0;
    const clear = () => {
      upload_button_select.classList.remove("loading");
      upload_progress.style.display = "none";
      upload_progress_value.style.width = "0%";
    };
    const complate = async () => {
      // 管控进度条
      index++;
      upload_progress_value.style.width = `${(index / count) * 100}%`;

      // 当所有切片都上传成功，我们合并切片
      if (index < count) return;
      upload_progress_value.style.width = `100%`;
      await delay(300);
      try {
        data = await instance.post(
          "/upload_merge",
          {
            HASH,
            count,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        if (+data.code === 0) {
          alert(
            `恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`
          );
          clear();
          return;
        }
        throw data.codeText;
      } catch (err) {
        alert("切片合并失败，请您稍后再试~~");
        clear();
      }
    };
    // 把每一个切片都上传到服务器上
    chunks.forEach((chunk) => {
      // 已经上传的无需在上传 实现秒传
      if (already.length > 0 && already.includes(chunk.filename)) {
        console(already);
        complate();
        return;
      }
      let fm = new FormData();
      fm.append("file", chunk.file);
      fm.append("filename", chunk.filename);
      instance
        .post("/upload_chunk", fm)
        .then((data) => {
          if (+data.code === 0) {
            complate();
            return;
          }
          return Promise.reject(data.codeText);
        })
        .catch(() => {
          alert("当前切片上传失败，请您稍后再试~~");
          clear();
        })
        .finally(() => {
          upload_inp.value = ""; // 清空input的值，即file
        });
    });
  });

  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });
})();
