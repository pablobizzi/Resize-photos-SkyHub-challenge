var request = require("request"),
assert = require('assert'),
base_url = "http://localhost:8080/";

describe("Teste Automatizado", function() {
  describe("GET /", function() {
    it("Retorna o JSON", function(done) {
      request.get(base_url, function(error, response, body) {
        assert.equal(200, response.statusCode);
        done();
      });
    });
  });
});
