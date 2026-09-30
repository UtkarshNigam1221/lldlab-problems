from orders.repository import InMemoryOrderRepository
from orders.router import Router
from orders.service import OrderService


def app():
    return Router(OrderService(InMemoryOrderRepository()))


@test("placing an order returns its id")
def _():
    assertEqual(app().handle("POST", "/orders", {"customer": "ana", "amount": 1200}), (201, {"id": 1}))


@test("an invalid amount is a 400")
def _():
    assertEqual(app().handle("POST", "/orders", {"customer": "ana", "amount": 0}), (400, {"error": "amount must be positive"}))


@test("an existing order can be fetched")
def _():
    a = app()
    a.handle("POST", "/orders", {"customer": "ana", "amount": 900})
    assertEqual(a.handle("GET", "/orders/1"), (200, {"id": 1, "customer": "ana", "amount": 900, "status": "placed"}))


@test("an unknown order is a 404")
def _():
    assertEqual(app().handle("GET", "/orders/42"), (404, {"error": "not found"}))


@test("an order can only be cancelled once")
def _():
    a = app()
    a.handle("POST", "/orders", {"customer": "ana", "amount": 500})
    assertEqual(a.handle("POST", "/orders/1/cancel"), (200, {"status": "cancelled"}))
    assertEqual(a.handle("POST", "/orders/1/cancel"), (400, {"error": "already cancelled"}))


@test("revenue ignores cancelled orders")
def _():
    a = app()
    a.handle("POST", "/orders", {"customer": "ana", "amount": 500})
    a.handle("POST", "/orders", {"customer": "ana", "amount": 700})
    a.handle("POST", "/orders/1/cancel")
    assertEqual(a.service.revenue("ana"), 700)
