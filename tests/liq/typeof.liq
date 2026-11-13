x = {foo = {bar = 1}}
def f((v:%typeof(x.foo.bar))) =
  v
end

def g(~(label:%typeof(x)?)) =
  label
end

(f(2) : %typeof(x).foo.bar)
let json.parse (saved : %typeof(data())) =
  '[{"id": 3}]'
let (y : %typeof(1)) = 3
z = ([] : [%typeof(1 + 2)])
h = (fun (v) -> v : (%typeof(x))->%typeof(x.foo))
