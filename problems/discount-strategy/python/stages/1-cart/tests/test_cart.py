from cart import *


@test("no discount sums prices")
def _():
    c = Cart(NoDiscount())
    c.add(300)
    c.add(700)
    assertEqual(c.total(), 1000)


@test("percent off rounds down")
def _():
    c = Cart(PercentOff(15))
    c.add(999)
    assertEqual(c.total(), 849)


@test("flat off never below zero")
def _():
    c = Cart(FlatOff(5000))
    c.add(1000)
    assertEqual(c.total(), 0)


@test("strategy can be swapped")
def _():
    c = Cart(NoDiscount())
    c.add(1000)
    c.set_strategy(FlatOff(100))
    assertEqual(c.total(), 900)
