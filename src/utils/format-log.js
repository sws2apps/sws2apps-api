import requestIp from "request-ip";

export const formatLog = (message, req, res) => {
  let log = {};

  if (req && res) {
    const clientIp = requestIp.getClientIp(req);
    log.method = req.method;
    log.status = res.statusCode;
    log.path = req.headers["x-original-uri"];
    log.origin = req.headers.origin || req.hostname;
    if (clientIp) log.ip = clientIp;
  }

  log.details = message.replace(/\n|\r/g, "");

  return JSON.stringify(log);
};
