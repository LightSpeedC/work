function fibonacci(n) {
	return n < 2 ? 1 : fibonacci(n - 2) + fibonacci(n - 1);
}

var n;
function bmk() {
	console.time(n);
}
function bmk2() {
	console.timeEnd(n);
}

n =  5; bmk(); console.log(n, fibonacci(n)); bmk2();
n =  5; bmk(); console.log(n, fibonacci(n)); bmk2();
n =  5; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 10; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 10; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 10; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 20; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 20; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 20; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 30; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 30; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 30; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 40; bmk(); console.log(n, fibonacci(n)); bmk2();
n = 40; bmk(); console.log(n, fibonacci(n)); bmk2();
