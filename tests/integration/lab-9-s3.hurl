# Step 1: Create a new text fragment with "Hello S3!"
 POST http://localhost:8080/v1/fragments
 
 # Set the content type to text/plain
 Content-Type: text/plain
 # Use HTTP Basic Auth for authorization
 [BasicAuth]
user1@email.com:password1
 # The body of the request is the fragment content
 `Hello S3!`
 
 # Check that we get a 201 Created status code
 HTTP/1.1 201
 # Capture the Location header value to use it later
 [Captures]
 url: header "Location"
 
 # Verify we get back the right Content-Type and fragment metadata
 [Asserts]
 header "Content-Type" == "application/json; charset=utf-8"
 jsonpath "$.status" == "ok"
 jsonpath "$.fragment.type" == "text/plain"
 
 # Step 2: GET the fragment we just created using the captured URL
 GET {{url}}
 Accept: text/plain
 [BasicAuth]
user1@email.com:password1

 
 # Check that we get a 200 OK status code
 HTTP/1.1 200
 # Verify the Content-Type is text/plain
 [Asserts]
 header "Content-Type" == "text/plain"
 body == "Hello S3!"
 
 # Step 3: DELETE the fragment
 DELETE {{url}}
 [BasicAuth]
user1@email.com:password1
 
 # Check that we get a 200 OK status code indicating successful deletion
 HTTP/1.1 200
 # Verify the response has the expected JSON structure
 [Asserts]
 header "Content-Type" == "application/json; charset=utf-8"
 jsonpath "$.status" == "ok"
 
 # Step 4: Try to GET the deleted fragment - should return 404 Not Found
 GET {{url}}
 [BasicAuth]
user1@email.com:password1
 
 # Verify that the fragment is gone (404 Not Found)
 HTTP/1.1 404
 [Asserts]
 header "Content-Type" == "application/json; charset=utf-8"
 jsonpath "$.status" == "error"