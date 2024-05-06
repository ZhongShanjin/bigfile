let instance = axios.create(); //创建了一个新的axios实例。这允许你为该实例配置自定义的设置，而不会影响全局axios默认设置。
instance.defaults.baseURL = "http://127.0.0.1:8888"; //设置了这个axios实例的默认基础URL。所有使用此实例发起的请求都会默认使用这个URL作为请求的前缀。
instance.defaults.headers["Content-Type"] = "multipart/form-data"; //为所有请求设置默认的Content-Type头部为multipart/form-data。这种内容类型通常用于需要上传文件时。在每个请求发出之前都会执行
instance.defaults.transformRequest = (data, headers) => {
  const contentType = headers["Content-Type"];
  if (contentType === "application/x-www-form-urlencoded")
    return Qs.stringify(data);
  return data;
};
/*配置请求转换函数，这个函数会在请求的数据发送到服务器之前执行。
函数首先从请求头中获取Content-Type。
如果Content-Type是application/x-www-form-urlencoded，则使用Qs.stringify方法将数据对象序列化为URL编码的字符串格式。Qs是一个库，用于解析和字符串化查询字符串。
如果不是这种内容类型，则直接返回数据。这意味着数据不会被转换。*/
/*const data = {
    name: 'John Doe',
    age: 30,
    hobbies: ['reading', 'gaming', 'hiking']
};
const queryString = Qs.stringify(data, { arrayFormat: 'brackets' });
输出: "name=John%20Doe&age=30&hobbies[]=reading&hobbies[]=gaming&hobbies[]=hiking"
{ arrayFormat: 'brackets' }，这样数组在转换后会附带方括号（这有助于某些服务器端框架正确解析数组参数）。
 */
instance.interceptors.response.use((response) => {
  return response.data;
});
/* 添加一个响应拦截器。拦截器是axios提供的功能，允许你在处理请求的响应之前或之后执行代码。
这个拦截器截取HTTP响应，只返回响应的data部分，而不是完整的响应对象。这通常用于简化从API接收数据的处理。*/
/*application/x-www-form-urlencoded格式：这种编码类型将表单元素作为键值对发送，就像查询字符串一样。键和值之间用=连接，而不同的键值对之间用&连接。例如：name=John+Doe&age=23。
适用场景：最适合发送简单的数据和小量数据，因为数据被编码为一长串URL编码的查询字符串。它不支持发送文件或二进制数据。
限制：仅适用于发送文本数据。如果字段内容包含有符号，如&或%等，这些符号需要被正确编码。*/
/*multipart/form-data格式：这种类型在发送表单数据时，将每个表单项处理成一个“部分”（part），每个部分独立发送。这种格式允许表单中包含任意类型的数据，包括二进制数据。
适用场景：用于文件上传或当表单数据中包含文件或非ASCII数据时。在发送大文件或二进制数据的表单时特别有用，因为它不需要对字符进行编码。
特点：每部分都被一个唯一的分界符分隔，这些分界符会在请求头中定义，保证不会与数据内容冲突。*/
/*数据支持：multipart/form-data 支持二进制数据和大量数据的传输，而 application/x-www-form-urlencoded 只支持文本数据。后者将所有数据字符转换为对应的ASCII字符。
效率：对于仅包含文本字段的小量数据，使用 application/x-www-form-urlencoded 通常更高效，因为 multipart/form-data 会因为其边界标记和头信息而产生额外的数据开销。
简单性：application/x-www-form-urlencoded 在编码上更简单直接，但 multipart/form-data 提供了更多灵活性和功能。*/