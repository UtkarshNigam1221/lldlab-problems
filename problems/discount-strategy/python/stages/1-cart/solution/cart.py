class NoDiscount:
    def apply(self, total):
        return total


class PercentOff:
    def __init__(self, percent):
        self.percent = percent

    def apply(self, total):
        return total * (100 - self.percent) // 100


class FlatOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return max(0, total - self.amount)


class Cart:
    def __init__(self, strategy):
        self.strategy = strategy
        self.prices = []

    def add(self, price):
        self.prices.append(price)

    def set_strategy(self, strategy):
        self.strategy = strategy

    def total(self):
        return self.strategy.apply(sum(self.prices))
