# post-fragments-unsupported-type.hurl
POST http://localhost:8080/v1/fragments
Content-Type: application/randomtype
[BasicAuth]
user1@email.com:password1
`This should fail as the content type does not exist!!`

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" isString