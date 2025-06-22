How to set IP of cafe: - 

Step 1 -Go to  https://api64.ipify.org/?format=json and get the IPv6 - {"ip":"2402:e280:3e46:3f1:6d90:18c2:3116:8ba"}
	then copy the Prefix -> 2402:e280
	Go to the https://whatismyipaddress.com/ and take ipv4 - 58.84.61.35 (you can also take both ipv4 and ipv6 from 	here..) copy both ip prefix -> 58.84

Step 2 - Paste this prefix to the Frontend/pages/table/[id].js
	to this line  ->   const allowedPrefixes = ['2402:e280', '58.84']; // Your café Wi-Fi prefixes



