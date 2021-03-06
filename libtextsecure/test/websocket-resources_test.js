/* vim: ts=4:sw=4
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

;(function() {
    'use strict';

    describe('WebSocket-Resource', function() {
        it('receives requests and sends responses', function(done) {
            // mock socket
            var request_id = '1';
            var socket = {
                send: function(data) {
                    var message = textsecure.protobuf.WebSocketMessage.decode(data);
                    assert.strictEqual(message.type, textsecure.protobuf.WebSocketMessage.Type.RESPONSE);
                    assert.strictEqual(message.response.message, 'OK');
                    assert.strictEqual(message.response.status, 200);
                    assert.strictEqual(message.response.id.toString(), request_id);
                    done();
                }
            };

            // actual test
            var resource = new WebSocketResource(socket, function (request) {
                assert.strictEqual(request.verb, 'PUT');
                assert.strictEqual(request.path, '/some/path');
                assertEqualArrayBuffers(request.body.toArrayBuffer(), new Uint8Array([1,2,3]).buffer);
                request.respond(200, 'OK');
            });

            // mock socket request
            socket.onmessage({
                data: new Blob([
                    new textsecure.protobuf.WebSocketMessage({
                        type: textsecure.protobuf.WebSocketMessage.Type.REQUEST,
                        request: {
                            id: request_id,
                            verb: 'PUT',
                            path: '/some/path',
                            body: new Uint8Array([1,2,3]).buffer
                        }
                    }).encode().toArrayBuffer()
                ])
            });
        });

        it('sends requests and receives responses', function(done) {
            // mock socket and request handler
            var request_id;
            var socket = {
                send: function(data) {
                    var message = textsecure.protobuf.WebSocketMessage.decode(data);
                    assert.strictEqual(message.type, textsecure.protobuf.WebSocketMessage.Type.REQUEST);
                    assert.strictEqual(message.request.verb, 'PUT');
                    assert.strictEqual(message.request.path, '/some/path');
                    assertEqualArrayBuffers(message.request.body.toArrayBuffer(), new Uint8Array([1,2,3]).buffer);
                    request_id = message.request.id;
                }
            };

            // actual test
            var resource = new WebSocketResource(socket, function() {});
            resource.sendRequest({
                verb: 'PUT',
                path: '/some/path',
                body: new Uint8Array([1,2,3]).buffer,
                error: done,
                success: function(message, status, request) {
                    assert.strictEqual(message, 'OK');
                    assert.strictEqual(status, 200);
                    done();
                }
            });

            // mock socket response
            socket.onmessage({
                data: new Blob([
                    new textsecure.protobuf.WebSocketMessage({
                        type: textsecure.protobuf.WebSocketMessage.Type.RESPONSE,
                        response: { id: request_id, message: 'OK', status: 200 }
                    }).encode().toArrayBuffer()
                ])
            });
        });
    });
}());
