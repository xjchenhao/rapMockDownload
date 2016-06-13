'use strict';

var http = require('http'),
    _ = require('underscore'),
    hfs = require('mass_fs');

var rapMock = function rapMock(opts) {
    opts = _.extend({
        rapDomain: 'http://rap.taobao.org', // rap的域
        apiDomain: '', // 接口的域
        projectId: 1, // 项目的id
        createPath: '', // 生成的mock文件路径
        isAnnotation: true, // 是否输出注释
        isLog: true, // 是否打印日志
        ignore: {
            moduleList: [], // 过滤项块
            pageList: [], // 过滤页面
            interfaceList: [] // 过滤某接口
        },
        writeBefore: '', // 前面添加文本
        writeAfter: '' // 后面添加文本
    }, opts);

    var url = opts.rapDomain + '/api/queryModel.do?projectId=' + opts.projectId;

    var count = 0,
        mockArr = [],
        endCallback = function endCallback() {
        var word = '';

        if (count) {
            return false;
        }

        //文档前添加文本
        word += opts.writeBefore;

        //插入mock模板
        mockArr.forEach(function (obj) {
            word += '// ' + obj.resName + '\n';
            word += 'Mock.mock(\'' + opts.apiDomain + obj.reqUrl + '\',' + obj.resCont + ');\n\n';
        });

        //文档后插入文本
        word += opts.writeAfter;

        // 输出文件
        hfs.writeFile(opts.createPath, word);
    };

    var request = http.get(url, function (res) {
        var html = '';

        res.on('data', function (data) {
            clearTimeout(timeout);
            html += data;
        });

        res.on('end', function () {
            var resultData = JSON.parse(html);

            clearTimeout(timeout);

            //接口返回错误
            if (resultData.code !== 200) {
                console.log(resultData.msg);
                return false;
            }

            resultData['model'].moduleList.forEach(function (moduleList) {
                if (_.find(opts.ignore.moduleList, function (x) {
                    return x == moduleList.name;
                })) {
                    return false;
                }

                moduleList['pageList'].forEach(function (pageList) {
                    if (_.find(opts.ignore.pageList, function (x) {
                        return x == pageList.name;
                    })) {
                        return false;
                    }

                    opts.isLog && console.log('|---' + pageList.name);
                    //opts.isAnnotation && fs.appendFileSync(opts.createPath, '//--------------------------【' + pageList.name + '】\n');

                    pageList['interfaceList'].forEach(function (interfaceList) {
                        if (_.find(opts.ignore.interfaceList, function (x) {
                            return x == interfaceList.name;
                        })) {
                            return false;
                        }

                        opts.isLog && console.log('|-----' + interfaceList.name + ':' + interfaceList.reqUrl);

                        count++;

                        http.get(opts.rapDomain + '/mockjs/'+opts.projectId + interfaceList.reqUrl, function (res) {
                            var html = '';

                            res.on('data', function (data) {
                                html += data;
                            });

                            res.on('end', function () {
                                count--;

                                mockArr.push({
                                    reqUrl: interfaceList.reqUrl,
                                    resName: interfaceList.name,
                                    resCont: html
                                });

                                endCallback();
                            });
                        });
                    });
                });
            });
        });

        res.on('error', function (err) {
            // clear timeout
            clearTimeout(timeout);
            console.log("Got error: " + err.message);
        });
    });

    var timeout_wrapper = function timeout_wrapper(req) {
        return function () {
            // 做一些记录,清洁等
            req.abort();
        };
    };

    // 产生超时处理程序
    var fn = timeout_wrapper(request);

    // 初始设置超时
    var timeout = setTimeout(fn, 10000);
};

module.exports = rapMock;

//# sourceMappingURL=index-compiled.js.map