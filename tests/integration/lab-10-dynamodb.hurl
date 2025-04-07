# Step 1: Create a JSON Fragment
# Perform an authenticated POST request to create a JSON fragment.
POST http://localhost:8080/v1/fragments

# Set the request headers.
Content-Type: application/json

# Include HTTP Basic Auth credentials.
[BasicAuth]
user1@email.com:password1

# Request body for creating a JSON fragment.
{
    "service":"DynamoDB"
}

# Step 2: Capture Fragment Information
# Capture the URL and ID of the created fragment from the response headers and body.
HTTP/1.1 201
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# Step 3: Retrieve and Validate Fragment Metadata
# Perform a GET request to retrieve fragment metadata and validate its properties.
GET {{fragment1_url}}/info
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
#jsonpath "$.status" 
jsonpath "$.fragment.id" == {{fragment1_id}}

# Validate metadata properties.
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" matches "^application/json(; charset=utf-8)?$"
jsonpath "$.fragment.size" == 22

# Step 4: Create a Markdown Fragment
# Perform an authenticated POST request to create a Markdown fragment.
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1

# Request body for the Markdown fragment.
`DynamoDB is **great**.`

# Step 5: Capture Information for Second Fragment
# Capture the URL and ID of the second created fragment.
HTTP/1.1 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# Step 6: Retrieve and Validate Metadata for Second Fragment
# Perform a GET request to retrieve metadata for the second fragment and validate its properties.
GET {{fragment2_url}}/info
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment2_id}}

# Validate metadata properties.
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" matches "text/markdown"
jsonpath "$.fragment.size" == 22

# Step 7: Retrieve Fragments List and Confirm Inclusion
# Perform a GET request to retrieve a list of fragments and confirm inclusion of fragment IDs.
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments" includes {{fragment1_id}}
jsonpath "$.fragments" includes {{fragment2_id}}

# Step 8: Delete the First Fragment
# Perform a DELETE request to delete the first created fragment.
DELETE {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

# Step 9: Confirm Deletion
# Confirm that the server returns a 200 status after fragment deletion.
HTTP/1.1 200

# Step 10: Attempt to Retrieve Deleted Fragment (Expecting 404)
# Attempt to retrieve the deleted fragment and confirm the server returns a 404 status.
GET {{fragment1_url}}/info
[BasicAuth]
user1@email.com:password1

# Step 11: Confirm Deleted Fragment (Expecting 404)
# Confirm that the server returns a 404 status, indicating the fragment is deleted.
HTTP/1.1 404

# Step 12: Retrieve Fragments List Again and Confirm Exclusion
# Perform a GET request to retrieve a list of fragments and confirm exclusion of the first fragment ID.
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments" not includes {{fragment1_id}}
jsonpath "$.fragments" includes {{fragment2_id}}