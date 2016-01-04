import http from 'http';
import fs from 'fs';
import path from 'path';
import _ from 'underscore';
import hfs from 'mass_fs';

var rapMock = function (opts) {
    opts = _.extend({
        domain: 'http://www.rapapi.net',    // rap的域
        projectId: 1,                       // 项目的id
        createPath: '',                     // 生成的mock文件路径
        isAnnotation: true,                 // 是否输出注释
        isLog: true,                        // 是否打印日志
        ignore: {
            moduleList: [],                 // 过滤项块
            pageList: [],                   // 过滤页面
            interfaceList: []               // 过滤某接口
        },
        writeBefore: '',                    // 前面添加文本
        writeAfter: ''                      // 后面添加文本
    }, opts);

    // 创建文件及目录
    hfs.writeFileSync(opts.createPath);

    var url = opts.domain + '/api/queryModel.do?projectId=' + opts.projectId;

    var apiIndex = 0,
        apiTotal = 0,
        mockArr = [],

        endCallback = function () {
            if (apiIndex < apiTotal) {
                return false;
            }

            mockArr.forEach(function (obj) {
                opts.isAnnotation && fs.appendFileSync(opts.createPath, '// ' + obj.resName + '\n');
                fs.appendFileSync(opts.createPath, 'Mock.mock(\'' + obj.reqUrl + '\',' + obj.resCont + ');\n\n');
            });

            fs.appendFileSync(opts.createPath, opts.writeAfter);
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

            //计算api总接口数(用来给api请求回调判断是否全部请求完成)
            resultData['model'].moduleList.forEach(function (moduleList) {
                if (_.find(opts.ignore.moduleList, x => x == moduleList.name)) {
                    return false;
                }

                moduleList['pageList'].forEach(function (pageList) {
                    if (_.find(opts.ignore.pageList, x => x == pageList.name)) {
                        return false;
                    }

                    pageList['interfaceList'].forEach(function (interfaceList) {
                        if (_.find(opts.ignore.interfaceList, x => x == interfaceList.name)) {
                            return false;
                        }
                        apiTotal++;
                    });
                });
            });

            //文档前添加文本
            fs.writeFileSync(opts.createPath, opts.writeBefore);

            resultData['model'].moduleList.forEach(function (moduleList) {
                if (_.find(opts.ignore.moduleList, x => x == moduleList.name)) {
                    return false;
                }

                moduleList['pageList'].forEach(function (pageList) {
                    if (_.find(opts.ignore.pageList, x => x == pageList.name)) {
                        return false;
                    }

                    opts.isLog && console.log('|---' + pageList.name);
                    //opts.isAnnotation && fs.appendFileSync(opts.createPath, '//--------------------------【' + pageList.name + '】\n');

                    pageList['interfaceList'].forEach(function (interfaceList) {
                        if (_.find(opts.ignore.interfaceList, x => x == interfaceList.name)) {
                            return false;
                        }

                        opts.isLog && console.log('|-----' + interfaceList.name + ':' + interfaceList.reqUrl);

                        http.get(opts.domain + '/mockjs/1' + interfaceList.reqUrl, function (res) {
                            var html = '';

                            res.on('data', function (data) {
                                html += data;
                            });

                            res.on('end', function () {

                                html = JSON.stringify(JSON.parse(html), null, 2);

                                mockArr.push({
                                    reqUrl: interfaceList.reqUrl,
                                    resName: interfaceList.name,
                                    resCont: html
                                });
                                apiIndex++;

                                endCallback();
                            });
                        });
                    });

                })
            });

            //文档后添加文本
            //fs.appendFile(opts.createPath, opts.writeAfter);
        });

        res.on('error', function (err) {
            // clear timeout
            clearTimeout(timeout);
            console.log("Got error: " + err.message);
        });
    });

    var timeout_wrapper = function (req) {
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

//rapMock({
//    domain: 'http://10.0.0.3:7777',
//    projectId: 1,
//    createPath: './qq/aa/99.js',
//    isAnnotation: true,
//    isLog: false,
//    ignore: {
//        moduleList: ['活动相关', '公共接口', '交易接口', '首页接口'],
//        pageList: [],
//        interfaceList: ['公用参数']
//    },
//    writeBefore: '\/\/writeBefore\n',
//    writeAfter: '\/\/writeAfter\n'
//});