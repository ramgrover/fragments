# post-fragments-unauthenticated.hurl
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
`This should fail due to no auth`

HTTP/1.1 401
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" isString