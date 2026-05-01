function handler(event) {
  var request = event.request;
  var headerName = "__INTERNAL_AUTH_HEADER_NAME__";
  var expected = "__INTERNAL_AUTH_HEADER_VALUE__";
  var header = request.headers[headerName];
  if (!header || header.value !== expected) {
    return { statusCode: 403, statusDescription: "Forbidden" };
  }
  return request;
}
