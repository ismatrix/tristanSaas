const httpStatus = require('http-status');
const https = require('https');
const catchAsync = require('../utils/catchAsync');
const { HttpsProxyAgent } = require('https-proxy-agent');

const getOrdersByParam = catchAsync(async (req, res) => {
  // Postman 中跑通的精确 Payload
  const postString = req.body.rawBody || '{"aid_language":"zh-CN","formItem":{"site":"","esopNo":"","esopProdOrdNo":"","esopOrderNo":"","aid_language":"zh-CN","input1":"","select1":"","customerName":"","intentionId":"","handleId":"","intentionCode":"","handleCode":"","requireCode":"","subProdOrdId":"","prodOrdId":"","handleType":"","productId":"","status":"","statusIsNormal":"","handleListStatus":"NORMAL","createDateStart":"2026-01-01","vpnId":"","createDateEnd":"","refNo":"","aContact":"","aContPhone":"","aAddress":"","aAddressDesc":"","bContact":"","bContPhone":"","bAddress":"","endCustomer":"","createStaffName":"","enterpriseName":"","custId":"","contractBelong":"","custType":"","isTimeout":"","contractSigned":"","supplierName":"","supplierId":"","orderType":"","importantProject":""},"pageNum":1,"pageSize":500,"handleRelFlag":"","custManagerName":"","bandWidth":"","bandWidthUnit":"1","detailAddress":"","customerName":"","createDateStart":"2026-01-01","createDateEnd":"","aContact":"","bContact":"","aContPhone":"","bContPhone":"","vpnId":"","createStaffName":"","custId":"","isTimeout":"","contractSigned":"","multipleItem":{"productIdList":{"0":"6850200002","1":"6850200003"},"statusList":{},"handleTypeList":{"0":"1"},"contractBelongList":{}},"supplierName":"","supplierId":"","intentionId":"","ccsRelHandleFlag":"0"}';

  // 动态读取参数（优先按请求头走，默认兜底使用 Postman 测试成功的配置）
  const dynamicAuth = req.headers['x-iboss-auth'] || 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NzU4NDI3MzAsInVzZXJfbmFtZSI6InRyaXN0YW53YW5nIiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9VU0VSIl0sImp0aSI6IjY2N2RjNmQ3LTU4MWEtNDJiNC1iZmE2LTc4ODM1OTllMGMxOCIsImNsaWVudF9pZCI6ImNtaUNvbmZpZGVudGlhbFdlYiIsInNjb3BlIjpbInJlYWQiXX0.BCrlYeCf88CqxADm0KiY65yoNeKLCLTbg81LuYOu6RfPZZ7TPxAeC8lYfuEcCpMrB_4fqpYYGoUN10MwlQrHniKdWb1Qz0udZFBqAPHXNwpIZCkZp3WI55wnH0N0LAXDsgSzHn1EtMVpRtTMVFpRIVuzhduOr7zxBFRzjFh2wIEdQIv2-3PcrCv5X0wEvSjvH3oZJDRD5rElPMTToWxNOxlLdNIqDo21wvMPBCuVRtTPDvkvjZ6I0oLymBbhm7b0kZupznkqtPdYdX93SLESrdS487xeyEQVTnGHimIfELPdmZs3FPJ-Tg1UhjIEx1yuBf2NAtxNWyi8nWWyi7cveg';
  const dynamicCookie = req.headers['x-iboss-cookie'] || 'JSESSIONID=00CBF20F0629BD28ECAA63C15EFA4D63; _ga=GA1.1.2088807115.1731569408; lang=zh-CN; _ga_6Q33Q169C3=GS2.1.s1775806731$o11$g0$t1775806731$j60$l0$h0; JSESSIONID=E656C089EB73ECD39E6D8B637DB044C6';
  const dynamicReferer = req.headers['x-iboss-referer'] || 'https://iboss.cmitry.com/mks/cmi-handle-query?mpType=2&menuId=1809212305&showMenuHead=8&mpId=null&acd=0&user=tristanwang&Sys=fs&code=cEIiXc&state=FD3049&userId=';

  // 通过系统的 local proxy 发送，端口 7897 实测为代理侦听口
  const agent = new HttpsProxyAgent('http://127.0.0.1:7897');

  const options = {
    hostname: 'iboss.cmitry.com',
    servername: 'iboss.cmitry.com', // 必须开启 SNI 保障
    port: 443,
    path: '/sa-mks/api/v1/product/handle-list-query',
    method: 'POST',
    agent: agent, // 强行拉闸走系统代理 VPN，完美解决 Node 忽略系统全局代理导致 502 的痛点
    // 伪装 Node.js 的底层 TLS 握手指纹 (JA3 Fingerprint Bypass)，防止高防 WAF 根据 C++ 引擎特征直拒
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
    minVersion: 'TLSv1.2',
    headers: {
      'accept': 'application/json, text/plain, */*', 
      'accept-language': 'und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6', 
      'authorization': dynamicAuth, 
      'connection': 'keep-alive',
      'content-type': 'application/json;charset=UTF-8', 
      'cookie': dynamicCookie, 
      'origin': 'https://iboss.cmitry.com', 
      'priority': 'u=1, i', 
      'referer': dynamicReferer, 
      'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"', 
      'sec-ch-ua-mobile': '?0', 
      'sec-ch-ua-platform': '"macOS"', 
      'sec-fetch-dest': 'empty', 
      'sec-fetch-mode': 'cors', 
      'sec-fetch-site': 'same-origin', 
      'traceparent': '00-418e2eec75b8a196128e715c8f20f773-4e474e8540c6b0c7-01', 
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Content-Length': Buffer.byteLength(postString)
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let responseData = '';
    proxyRes.on('data', (chunk) => {
      responseData += chunk;
    });

    proxyRes.on('end', () => {
      try {
        const jsonResult = JSON.parse(responseData);
        res.status(200).send({
          originalStatus: proxyRes.statusCode,
          ...jsonResult
        });
      } catch (e) {
        // 返回未能解析的真实响应体（通常这代表外层直接拒绝了请求，或 WAF 封堵网页）
        res.status(200).send({ 
          originalStatus: proxyRes.statusCode,
          data: responseData, 
          error: "Failed to parse json. It seems the upstream iBOSS server returned an error page (e.g. 502 Bad Gateway). Your Token/Cookie might be expired." 
        });
      }
    });
  });

  proxyReq.on('error', (error) => {
    console.error('Error fetching iBoss orders:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error communicating with iBOSS server' });
  });

  proxyReq.write(postString);
  proxyReq.end();
});

module.exports = {
  getOrdersByParam,
};

// END_OF_BLOCK
