# Test updating a fragment with valid data
# 1. Create a fragment first
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`This is a fragment`

# Store the Fragment's ID
HTTP/1.1 201
[Captures]
fragment_id: jsonpath "$.fragment.id"

# 2. Update the fragment
PUT http://localhost:8080/v1/fragments/{{fragment_id}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`This is updated fragment data`

# Verify the response
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment_id}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 29

# 3. Get the updated fragment to verify changes
GET http://localhost:8080/v1/fragments/{{fragment_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body == "This is updated fragment data"

# Test 4: Try to update a fragment with a different content type
# Create a text fragment first
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`This is a fragment`

HTTP/1.1 201
[Captures]
text_fragment_id: jsonpath "$.fragment.id"

# Attempt to update with a different content type (should fail)
PUT http://localhost:8080/v1/fragments/{{text_fragment_id}}
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{"key": "value"}`

HTTP/1.1 400
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" contains "Content type cannot be changed"

# Test 5: Try to update a non-existent fragment
PUT http://localhost:8080/v1/fragments/non-existent-id
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`This will fail`

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" contains "Fragment not found"

# Test 6: Try to update a fragment with empty data
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Another fragment`

HTTP/1.1 201
[Captures]
empty_test_id: jsonpath "$.fragment.id"

# Attempt to update with empty data (should fail)
PUT http://localhost:8080/v1/fragments/{{empty_test_id}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
``

HTTP/1.1 400
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" contains "Fragment data missing"