from dataclasses import dataclass


@dataclass
class Order:
    id: int
    customer: str
    amount: int  # cents
    status: str = "placed"  # placed | cancelled
