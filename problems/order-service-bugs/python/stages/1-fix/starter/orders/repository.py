from orders.models import Order


class InMemoryOrderRepository:
    def __init__(self):
        self._orders = {}
        self._next_id = 1

    def add(self, customer, amount):
        order = Order(id=self._next_id, customer=customer, amount=amount)
        self._orders[order.id] = order
        self._next_id += 1
        return order

    def get(self, order_id):
        return self._orders.get(order_id)

    def list_by_customer(self, customer):
        return [o for o in self._orders.values() if o.customer == customer]
