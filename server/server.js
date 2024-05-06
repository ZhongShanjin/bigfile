const express = require("express"),
  fs = require("fs"),
  bodyParser = require("body-parser"),
  multiparty = require("multiparty"),
  SparkMD5 = require("spark-md5");
/*1. express: 一个灵活的 Node.js Web 应用框架。它允许您设置中间件来响应 HTTP 请求，定义了路由表用于执行不同的 HTTP 请求动作（如 GET, POST, PUT, DELETE 等），可以通过各种插件扩展其功能。
2. fs: 模块提供了一套用于与文件系统进行交互的 API。它可以用来读取、写入、更改、删除文件，以及与文件系统交互的其他多种功能，是 Node.js 标准库的一部分。
3. body-parser: 是一个中间件，用于处理 JSON, Raw, Text 和 URL 编码的数据。解析客户端请求中的 body 中的信息（例如表单数据），使其通过 req.body 挂起的方式便于访问。
4. multiparty: 是一个用于解析 HTTP 请求中的 multipart/form-data 负载的模块，通常用于上传文件。它可以处理大量的同步和异步文件上传，处理文件分割，并把上传的文件保存到指定目录。
5. SparkMD5 是一个快速的纯 JavaScript MD5 实现。它用于计算数据（通常是文件）的 MD5 哈希值，非常适用于在浏览器和服务器上快速计算大型文件的 MD5。因为它的速度，常用于实时应用，如即时文件验证。
6. MD5（Message-Digest Algorithm 5）是一种广泛使用的加密散列函数，它产生一个128位（16字节）的散列值，通常用32个十六进制数字表示。*/
/*-CREATE SERVER-*/
const app = express(),
  PORT = 8888, //端口号
  HOST = "http://127.0.0.1", //服务器地址
  HOSTNAME = `${HOST}:${PORT}`; //完整的访问URL
app.listen(PORT, () => {
  console.log(
    `THE WEB SERVICE IS CREATED SUCCESSFULLY AND IS LISTENING TO THE PORT：${PORT}，YOU CAN VISIT：${HOSTNAME}`
  ); //当服务器启动并开始监听指定端口时
});

/*-中间件-设置了CORS（跨源资源共享），允许所有域名的交互请求。如果请求方法是OPTIONS，它将返回一条消息表示支持跨域请求，否则继续执行后续中间件。req、res 和 next 分别代表请求对象、响应对象和一个函数，用来调用下一个中间件。在进行跨源请求时（尤其是那些可能对服务器数据有副作用的请求，如POST、PUT、DELETE等），浏览器会首先发送一个OPTIONS请求到服务器，询问服务器是否允许跨源请求，并且询问可以使用哪些HTTP方法和头信息。这种请求称为“预检”请求，它发送之前不会发送实际的数据请求。预检请求的响应决定了主请求是否可以被发送。预检请求包含的头部信息通常有：
Access-Control-Request-Method: 表明实际请求将会使用的HTTP方法。
Access-Control-Request-Headers: 表明实际请求将会携带的自定义头部字段。
req封装了客户端发起的HTTP请求的所有信息，包括URL参数、路径、头部信息、请求体等。
res提供了一系列方法来构建和发送HTTP响应给客户端。这包括设置响应状态码、响应头、发送响应数据等*/
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); //这行代码设置了响应头Access-Control-Allow-Origin，其值为*，这表示允许所有的外部域访问这个服务器的资源。这是CORS（跨源资源共享）策略的一部分，用于放宽同源策略。*代表允许所有的跨域请求，不限制任何域。
  req.method === "OPTIONS"
    ? res.send("CURRENT SERVICES SUPPORT CROSS DOMAIN REQUESTS!")
    : next(); // next()继续处理请求的下一个中间件或路由。
});
/*中间件使用bodyParser.urlencoded解析POST请求中的urlencoded体（通常用于表单提交），其中extended: false表示使用库内置解析器，limit: "1024mb"设置请求体的大小限制。*/
app.use(
  //解析通过HTTP POST请求发送的x-www-form-urlencoded格式的数据
  bodyParser.urlencoded({
    extended: false, //使用querystring库（Node.js的核心模块）来解析数据extended: true会使用更现代的qs库进行解析，它可以支持嵌套对象和数组的编码
    limit: "1024mb", //允许解析最大为1GB大小的URL编码的请求体。
  })
);

/*-API-*/
// 延迟函数
const delay = function delay(interval) {
  typeof interval !== "number" ? (interval = 1000) : null;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, interval);
  });
};

// 检测文件是否存在
const exists = function exists(path) {
  return new Promise((resolve) => {
    /*fs.access主要用于测试文件或目录的存在性以及它们的访问权限。
    fs.constants.F_OK: 检查文件是否存在。
    fs.constants.R_OK: 检查文件是否可读。
    fs.constants.W_OK: 检查文件是否可写。
    fs.constants.X_OK: 检查文件是否可执行（在 Windows 中不可用，所有文件都被视为可执行）。*/
    fs.access(path, fs.constants.F_OK, (err) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
};

// 创建文件并写入到指定的目录 & 返回客户端结果
/*res: 响应对象，用于向客户端发送HTTP响应。
path: 字符串，表示文件应该被保存的服务器上的目标路径。
file: 文件对象，包含文件的数据和元数据。
filename: 上传的原始文件名。
stream: 布尔值，指示是否使用流式处理方式来写入文件。
优点:
内存效率：使用流来处理文件可以非常内存效率。数据以小块（chunks）的形式处理，这意味着不需要一次性将整个文件内容加载到内存中，适合处理大文件。
时间效率：因为数据是边读边写，所以在处理大文件时，可以更快地开始处理数据，而不必等待整个文件都读入内存。
可控制性：流提供了更多的控制选项，如暂停（pause）、恢复（resume）数据传输，以及更细粒度的错误处理。
缺点:
复杂性：使用流编写代码比简单使用fs.writeFile更复杂，需要更多的错误处理代码。
错误处理：流操作中可能会发生多种错误，需要在多个地方进行错误监听和处理。
fs.writeFile
优点:
简单性：fs.writeFile提供了一个简单的API，只需一行代码即可写入文件，对于新手来说更易于理解和使用。
便利性：对于小文件，这种方式可以快速简单地完成任务，代码更加直观。
缺点:
内存效率：fs.writeFile会将整个文件内容一次性加载到内存中，然后写入磁盘。对于大文件，这可能导致大量的内存消耗。
时间效率：对于大文件，必须等待整个文件都被读入内存后才开始写入，这会造成延迟。*/
const writeFile = function writeFile(res, path, file, filename, stream) {
  return new Promise((resolve, reject) => {
    if (stream) {
      try {
        //创建一个可读流，从源文件位置读取数据。创建一个可写流，将数据写入到目标路径。
        let readStream = fs.createReadStream(file.path),
          writeStream = fs.createWriteStream(path);
        readStream.pipe(writeStream); //方法将读取流的输出直接连接到写入流的输入，这是处理大文件的有效方式。监听 readStream 的 "end" 事件，表示文件已经完全写入写入流。
        readStream.on("end", () => {
          resolve();
          fs.unlinkSync(file.path); //删除源文件
          res.send({
            code: 0,
            codeText: "upload success",
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME),
          });
        });
      } catch (err) {
        reject(err);
        res.send({
          code: 1,
          codeText: err,
        });
      }
      return;
    }
    //使用 fs.writeFile 直接将文件数据写入到指定的路径。
    fs.writeFile(path, file, (err) => {
      if (err) {
        reject(err);
        res.send({
          code: 1,
          codeText: err,
        });
        return;
      }
      resolve();
      res.send({
        code: 0,
        codeText: "upload success",
        originalFilename: filename,
        servicePath: path.replace(__dirname, HOSTNAME),
      });
    });
  });
};

// 基于multiparty插件实现文件上传处理 & form-data解析。multiparty 是一个用于解析 multipart/form-data 请求的Node.js库，通常用于上传文件。
const uploadDir = `${__dirname}/upload`; //设置一个上传目录，存储上传的文件。
const multiparty_upload = function multiparty_upload(req, auto) {
  typeof auto !== "boolean" ? (auto = false) : null; //布尔值，指示是否自动将上传的文件保存到指定目录。
  let config = {
    // 设置最大字段大小
    maxFieldsSize: 200 * 1024 * 1024,
  };
  if (auto) config.uploadDir = uploadDir;
  return new Promise(async (resolve, reject) => {
    await delay();
    /*使用 multiparty.Form(config) 创建一个表单解析器实例。参数：构造函数 Form 可以接受一个配置对象 config，该对象有几个选项：autoFiles: 布尔值，如果设置为 true，上传的文件会被自动保存到磁盘，否则需要手动处理文件流。
    uploadDir: 字符串，指定上传文件的存储目录。
    maxFieldsSize: 数字，设置非文件字段的最大大小。
    maxFilesSize: 数字，设置文件的最大接受大小。
    调用 .parse(req, callback) 方法解析请求 req，结果通过回调函数返回。
    回调函数参数 err, fields, files 分别代表解析过程中发生的错误、字段数据和文件数据。 */
    new multiparty.Form(config).parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        fields,
        files,
      });
    });
  });
};

// 单文件上传处理「FORM-DATA」
app.post("/upload_single", async (req, res) => {
  try {
    let { files } = await multiparty_upload(req, true);
    let file = (files.file && files.file[0]) || {};
    res.send({
      code: 0,
      codeText: "upload success",
      originalFilename: file.originalFilename,
      servicePath: file.path.replace(__dirname, HOSTNAME),
    });
  } catch (err) {
    res.send({
      code: 1,
      codeText: err,
    });
  }
});

app.post("/upload_single_name", async (req, res) => {
  try {
    let { fields, files } = await multiparty_upload(req);
    let file = (files.file && files.file[0]) || {},
      filename = (fields.filename && fields.filename[0]) || "",
      path = `${uploadDir}/${filename}`,
      isExists = false;
    // 检测是否存在
    isExists = await exists(path);
    if (isExists) {
      fs.unlinkSync(file.path);
      res.send({
        code: 0,
        codeText: "file is exists",
        originalFilename: filename,
        servicePath: path.replace(__dirname, HOSTNAME),
      });
      return;
    }
    writeFile(res, path, file, filename, true);
  } catch (err) {
    res.send({
      code: 1,
      codeText: err,
    });
  }
});

// 单文件上传处理「BASE64」
app.post("/upload_single_base64", async (req, res) => {
  let file = req.body.file,
    filename = req.body.filename,
    spark = new SparkMD5.ArrayBuffer(),
    suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1],
    isExists = false,
    path;
  file = decodeURIComponent(file); //解码URL编码的字符串
  file = file.replace(/^data:image\/\w+;base64,/, ""); //使用正则表达式删除Base64数据URI方案的前缀（针对图像文件）。\w+匹配连续的字母数字以及下划线。例如：data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD。replace之后：/9j/4AAQSkZJRgABAQAAAQABAAD
  file = Buffer.from(file, "base64"); //Base64字符串转换为二进制缓冲区
  spark.append(file); //MD5实例添加数据（即文件缓冲区）。
  path = `${uploadDir}/${spark.end()}.${suffix}`;
  await delay();
  // 检测是否存在
  isExists = await exists(path);
  if (isExists) {
    res.send({
      code: 0,
      codeText: "file is exists",
      originalFilename: filename,
      servicePath: path.replace(__dirname, HOSTNAME),
    });
    return;
  }
  writeFile(res, path, file, filename, false);
});

// 大文件切片上传 & 合并切片
const merge = function merge(HASH, count) {
  return new Promise(async (resolve, reject) => {
    let path = `${uploadDir}/${HASH}`,
      fileList = [],
      suffix,
      isExists;
    isExists = await exists(path);
    if (!isExists) {
      reject("HASH path is not found!");
      return;
    }
    fileList = fs.readdirSync(path); //同步读取目录下的文件列表，存储到 fileList。
    if (fileList.length < count) {
      reject("the slice has not been uploaded!");
      return;
    }
    //fs.readFileSync 是 Node.js 的文件系统模块中的一个方法，用于同步读取文件的内容并返回。它接收一个文件路径作为参数，并将文件内容以缓冲区（Buffer）或字符串的形式返回。
    //fs.appendFileSync 方法用于将数据同步追加到一个文件的末尾。如果文件不存在，Node.js 将为你创建这个文件。
    fileList
      .sort((a, b) => {
        let reg = /_(\d+)/;
        return reg.exec(a)[1] - reg.exec(b)[1];
      })
      .forEach((item) => {
        !suffix ? (suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1]) : null;
        fs.appendFileSync(
          `${uploadDir}/${HASH}.${suffix}`,
          fs.readFileSync(`${path}/${item}`)
        );
        fs.unlinkSync(`${path}/${item}`);
      });
    fs.rmdirSync(path); //删除存放切片的目录。
    resolve({
      path: `${uploadDir}/${HASH}.${suffix}`,
      filename: `${HASH}.${suffix}`,
    });
  });
};

app.post("/upload_chunk", async (req, res) => {
  try {
    let { fields, files } = await multiparty_upload(req);
    let file = (files.file && files.file[0]) || {},
      filename = (fields.filename && fields.filename[0]) || "",
      path = "",
      isExists = false;
    // 创建存放切片的临时目录
    let [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
    //[^_] 这是一个字符类，表示匹配除下划线_之外的任何单个字符。
    path = `${uploadDir}/${HASH}`;
    !fs.existsSync(path) ? fs.mkdirSync(path) : null; //检查这个路径是否存在。如果不存在，创建一个新的目录。
    // 把切片存储到临时目录中
    path = `${uploadDir}/${HASH}/${filename}`;
    isExists = await exists(path);
    if (isExists) {
      res.send({
        code: 0,
        codeText: "file is exists",
        originalFilename: filename,
        servicePath: path.replace(__dirname, HOSTNAME),
      });
      return;
    }
    writeFile(res, path, file, filename, true);
  } catch (err) {
    res.send({
      code: 1,
      codeText: err,
    });
  }
});

app.post("/upload_merge", async (req, res) => {
  let { HASH, count } = req.body;
  try {
    let { filename, path } = await merge(HASH, count);
    res.send({
      code: 0,
      codeText: "merge success",
      originalFilename: filename,
      servicePath: path.replace(__dirname, HOSTNAME),
    });
  } catch (err) {
    res.send({
      code: 1,
      codeText: err,
    });
  }
});
app.get("/upload_already", async (req, res) => {
  let { HASH, suffix } = req.query;
  let path = `${uploadDir}/${HASH}`;
  let fileList = [];
  let servicePath = "";
  try {
    fileList = fs.readdirSync(path);
    fileList = fileList.sort((a, b) => {
      let reg = /_(\d+)/;
      return reg.exec(a)[1] - reg.exec(b)[1];
    });
    res.send({
      code: 0,
      codeText: "",
      fileList: fileList,
    });
  } catch (err) {
    try {
      fileList = fs.readdirSync(uploadDir);
      if (fileList.includes(`${HASH}.${suffix}`)) {
        servicePath = `${uploadDir}/${HASH}.${suffix}`;
      }
      res.send({
        code: 0,
        codeText: "",
        fileList: fileList,
        servicePath: servicePath.replace(__dirname, HOSTNAME),
      });
    } catch (err) {
      res.send({
        code: 1,
        codeText: "Error reading directories",
        fileList: [],
      });
    }
  }
});
//这是Express的内置中间件函数，用于托管静态文件。这里的 "./" 表示静态文件的根目录是当前目录（也就是运行Node.js应用的目录）。这意味着Express会自动响应来自这个目录及其子目录中静态文件的请求。例如，如果你的项目根目录下有一个名为 index.html 的文件，用户可以通过访问服务器的根URL（如 http://localhost/）来直接访问这个文件。如果请求的是 http://localhost/css/style.css，Express会尝试从项目的 ./css 目录下提供 style.css 文件。
app.use(express.static("./"));
//app.use((req, res) => {...}): 这是一个没有指定路径的中间件，适用于所有请求。因为Express按照中间件在代码中出现的顺序执行它们，所以这段代码将捕获所有未被前面的中间件处理的请求（即所有不存在的路由或文件）。
app.use((req, res) => {
  res.status(404); //这行代码设置HTTP响应的状态码为404，表示未找到请求的资源。
  res.send("NOT FOUND!");
});
