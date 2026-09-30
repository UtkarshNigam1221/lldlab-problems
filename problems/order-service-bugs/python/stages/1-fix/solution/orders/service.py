class OrderService:
    def __init__(self, repo):
        self.repo = repo

    def place(self, customer, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        return self.repo.add(customer, amount)

    def cancel(self, order_id):
        order = self.repo.get(order_id)
        if order is None:
            raise KeyError(order_id)
        if order.status == "cancelled":
            raise ValueError("already cancelled")
        order.status = "cancelled"
        return order

    def revenue(self, customer):
        return sum(o.amount for o in self.repo.list_by_customer(customer) if o.status != "cancelled")
