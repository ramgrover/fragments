# Confirm that posting a JSON fragment works, and doing a GET for the same fragment returns the expected result

POST http://localhost:8080/v1/fragments
# We're sending a JSON fragment
Content-Type: application/json
# Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1
# JSON data for the body
`{ "name": "Sample" , "value": 123, "active": true }`

# 1. Verify successful creation
HTTP/1.1 201
[Asserts]
# Check the response status
jsonpath "$.status" == "ok"
# Check the fragment type
jsonpath "$.fragment.type" == "application/json"
# Check the fragment size
jsonpath "$.fragment.size" == 51
# Capture the Location URL
[Captures]
fragment_url: header "Location"

# 2. Get the created fragment
GET {{fragment_url}}
[BasicAuth]
user1@email.com:password1

# 3. Verify the response
HTTP/1.1 200
[Asserts]
header "Content-Type" == "application/json"
jsonpath "$.name" == "Sample"
jsonpath "$.value" == 123
jsonpath "$.active" == true