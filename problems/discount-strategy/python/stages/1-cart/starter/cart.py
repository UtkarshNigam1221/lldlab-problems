class NoDiscount:
    def apply(self, total):
        # TODO
        return 0


class PercentOff:
    def __init__(self, percent):
        self.percent = percent

    def apply(self, total):
        # TODO
        return 0


class FlatOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        # TODO
        return 0


class Cart:
    def __init__(self, strategy):
        # TODO
        pass

    def add(self, price):
        pass

    def set_strategy(self, strategy):
        pass

    def total(self):
        return 0
