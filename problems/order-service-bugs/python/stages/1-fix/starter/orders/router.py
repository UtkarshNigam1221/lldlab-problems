class Router:
    """A tiny HTTP-like router over OrderService: handle(method, path, body) -> (status, body)."""

    def __init__(self, service):
        self.service = service

    def handle(self, method, path, body=None):
        parts = [p for p in path.split("/") if p]
        try:
            if method == "POST" and parts == ["orders"]:
                order = self.service.place(body["customer"], body["amount"])
                return 201, {"id": order.id}
            if method == "GET" and len(parts) == 2 and parts[0] == "orders":
                order = self.service.repo.get(int(parts[1]))
                return 200, None if order is None else vars(order)
            if method == "POST" and len(parts) == 3 and parts[0] == "orders" and parts[2] == "cancel":
                self.service.cancel(int(parts[1]))
                return 200, {"status": "cancelled"}
        except ValueError as e:
            return 400, {"error": str(e)}
        except KeyError:
            return 404, {"error": "not found"}
        return 404, {"error": "no route"}
