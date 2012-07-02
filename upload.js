var fs   = require('fs')
  , http = require('http')
  , util = require('util')
  , _    = require('underscore')
  

var upload = function(opts){
  if (!(this instanceof upload)) return new upload(opts)
  this.options = opts
  this.options.port = opts.port || '8001'
  this.options.method = opts.method || 'POST'
  this.options.path   = opts.path   || '/files/upload'
  this.options.host  = opts.host  || 'localhost'
  this.options.headers = opts.headers || {}
  this.options.file = opts.file || false
  if(!this.options.file) console.log('filepath not set!')
  return this
}

module.exports = upload

upload.prototype.xhr = function(opts,cb){

  if(!cb && _.isFunction(opts)){
    cb = opts
    opts = { headers : {} }
  }
  cb = cb || function(err,ok){ err && console.log(err)}
  opts = opts || { headers : {} }
  
  var readStream
    , req
    , defaults = 
      { headers : 
        { 'Content-Type'  : 'application/octet-stream'
        , 'x-file-name'   : getFileName(this.options.file)
        }
      }
    
  _.extend(opts.headers,defaults.headers)
  _.extend(this.options,opts) 
  this.options.headers['Content-Length'] = fs.statSync(this.options.file).size
   
  req = this.getRequestObj(cb)
  readStream = fs.createReadStream(this.options.file)
  readStream.pipe(req)
}

upload.prototype.multipart = function(opts,cb){
  
  if(!cb && _.isFunction(opts)){
    cb = opts
    opts = { headers : {} }
  }
  cb = cb || function(err,ok){ err && console.log(err)}
  opts = opts || { headers : {} }
  
  var self = this
    , readStream
    , boundary = Math.random()
    , req
    , defaults = 
      { headers : 
        { 'Content-Type'   : 'multipart/form-data; boundary=' + boundary
        , 'x-file-name'   : getFileName(this.options.file)
        }
      }
    , data = []
    , file_contents = ''
    , contentLength = 0
    , readStream
    
  _.extend(opts.headers,defaults.headers)
  _.extend(this.options,opts)
  this.options.mime = 'image/jpeg' || this.options.mime
  
  data.push(new Buffer(encodeFilePart( boundary
                                     , this.options.mime
                                     , getFileName(this.options.file)
                                     , getFileName(this.options.file)
                                     ), 'ascii'))
  
  readStream = fs.createReadStream(this.options.file, {encoding: 'binary'})
  readStream.on('data', function(data){
    file_contents += data
  })
  readStream.on('end', function(){
    data.push(new Buffer(file_contents, 'binary'))
    data.push(new Buffer("\r\n--" + boundary + "--"), 'ascii')
    
    for(var i = 0, len = data.length; i < len; i++)
      contentLength+=data[i].length
    
    self.options.headers['Content-Length'] = contentLength 
    
    req = self.getRequestObj(cb)
    for(var i = 0, len = data.length; i < len; i++)
      req.write(data[i])
    req.end()
  })
}

upload.prototype.getRequestObj = function(cb){
  var data = ''
    , self = this
    , req
    
  req = http.request(this.options, function(res){
    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      data+=chunk
    })
    res.on('end',function(){
      if(self.options.rawData) return cb(null,data)
      try {
        data = JSON.parse(data)
        cb(null,data)
      } catch (e){
        cb({error:e,data:data})
      }
    })
  })
  req.on('error',function(e){
    return cb(e)
  })
  return req
}


function encodeFieldPart(boundary,name,value) {
  var return_part = "--" + boundary + "\r\n";
  return_part += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
  return_part += value + "\r\n";
  return return_part;
}

function encodeFilePart(boundary,type,name,filename) {
  var return_part = "--" + boundary + "\r\n";
  return_part += "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n";
  return_part += "Content-Type: " + type + "\r\n\r\n";
  return return_part;
}

function getFileName(path){
  return path.substr(path.lastIndexOf('/')+1,path.length)
}

//data.push(new Buffer(EncodeFieldPart(boundary, 'field1', 'value1'), 'ascii'));
//data.push(new Buffer(EncodeFieldPart(boundary, 'field2', 'value2'), 'ascii'));
