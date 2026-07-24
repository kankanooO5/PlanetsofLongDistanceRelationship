import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/page.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var moods = [
	{
		emoji: "🌤️",
		label: "心情不错"
	},
	{
		emoji: "💭",
		label: "正在想你"
	},
	{
		emoji: "🫧",
		label: "有点累了"
	},
	{
		emoji: "🌙",
		label: "需要抱抱"
	}
];
function daysBetween(date, now = /* @__PURE__ */ new Date()) {
	const start = /* @__PURE__ */ new Date(`${date}T00:00:00`);
	return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 864e5));
}
function daysUntil(date, now = /* @__PURE__ */ new Date()) {
	const target = /* @__PURE__ */ new Date(`${date}T00:00:00`);
	return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 864e5));
}
function relativeTime(date) {
	const minutes = Math.max(0, Math.floor((Date.now() - (/* @__PURE__ */ new Date(`${date.replace(" ", "T")}Z`)).getTime()) / 6e4));
	if (minutes < 1) return "刚刚";
	if (minutes < 60) return `${minutes}分钟前`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
	return `${Math.floor(minutes / 1440)}天前`;
}
function Home() {
	const [code, setCode] = (0, import_react.useState)("");
	const [role, setRole] = (0, import_react.useState)("first");
	const [entered, setEntered] = (0, import_react.useState)(false);
	const [data, setData] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("home");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)("");
	const [wish, setWish] = (0, import_react.useState)("");
	const [toast, setToast] = (0, import_react.useState)("");
	const name = data ? role === "first" ? data.settings.firstName : data.settings.secondName : "我";
	const partnerName = data ? role === "first" ? data.settings.secondName : data.settings.firstName : "他";
	const request = (0, import_react.useCallback)(async (body) => {
		const response = await fetch("/api/couple", {
			method: body ? "POST" : "GET",
			headers: {
				"content-type": "application/json",
				"x-couple-code": code
			},
			body: body ? JSON.stringify(body) : void 0
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || "暂时无法连接");
		return result;
	}, [code]);
	const loadData = (0, import_react.useCallback)(async () => {
		setData(await request());
	}, [request]);
	(0, import_react.useEffect)(() => {
		const savedCode = window.localStorage.getItem("two-planets-code");
		const savedRole = window.localStorage.getItem("two-planets-role");
		if (savedCode) setCode(savedCode);
		if (savedRole === "first" || savedRole === "second") setRole(savedRole);
		if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => void 0);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!entered) return;
		const timer = window.setInterval(() => loadData().catch(() => void 0), 3e4);
		return () => window.clearInterval(timer);
	}, [entered, loadData]);
	const enter = async (event) => {
		event.preventDefault();
		setLoading(true);
		setError("");
		try {
			await loadData();
			window.localStorage.setItem("two-planets-code", code);
			window.localStorage.setItem("two-planets-role", role);
			setEntered(true);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "进入失败");
		} finally {
			setLoading(false);
		}
	};
	const mutate = async (body, success) => {
		setLoading(true);
		try {
			setData(await request(body));
			setToast(success);
			window.setTimeout(() => setToast(""), 2200);
		} catch (reason) {
			setToast(reason instanceof Error ? reason.message : "操作失败");
		} finally {
			setLoading(false);
		}
	};
	const ownStatus = data?.statuses.find((item) => item.role === role);
	const partnerStatus = data?.statuses.find((item) => item.role !== role);
	const relationshipDays = (0, import_react.useMemo)(() => data ? daysBetween(data.settings.startDate) : 0, [data]);
	const meetingDays = (0, import_react.useMemo)(() => data ? daysUntil(data.settings.nextMeeting) : 0, [data]);
	if (!entered || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "welcome",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "orbit orbit-one" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "orbit orbit-two" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "welcome-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "brand-mark",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "●" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "●" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "eyebrow",
						children: "TWO PLANETS · ONE HOME"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "两颗星球" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "welcome-copy",
						children: "不管相隔多远，我们都在同一个小宇宙里。"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: enter,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "secret",
								children: "我们的暗号"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "secret",
								value: code,
								onChange: (event) => setCode(event.target.value),
								placeholder: "输入只有你们知道的暗号",
								autoComplete: "current-password",
								required: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "今天是谁来到这里？" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "role-picker",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: role === "first" ? "selected" : "",
									type: "button",
									onClick: () => setRole("first"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "☀️" }), "我是星球 A"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: role === "second" ? "selected" : "",
									type: "button",
									onClick: () => setRole("second"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🌙" }), "我是星球 B"]
								})]
							})] }),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "form-error",
								children: error
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary-button",
								disabled: loading,
								type: "submit",
								children: loading ? "正在连接…" : "进入我们的小宇宙"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "privacy-note",
						children: "只有知道暗号的人才能进入"
					})
				]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "app-shell",
		children: [
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "toast",
				children: toast
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "OUR LITTLE UNIVERSE"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: ["晚上好，", name] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "avatar-button",
					type: "button",
					"aria-label": "切换身份",
					onClick: () => {
						setEntered(false);
						setData(null);
					},
					children: role === "first" ? "☀️" : "🌙"
				})]
			}),
			tab === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "hero-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hero-copy",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "我们已经在一起" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: relationshipDays }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "天" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "stars",
								"aria-hidden": "true",
								children: "✦ · ✧ · ✦"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"距离下次见面还有 ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: meetingDays }),
								" 天"
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "section-heading",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "此刻的我们" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "轻轻告诉对方，你现在怎么样" })] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "status-grid",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "status-card own",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "status-emoji",
									children: ownStatus?.emoji ?? "🌤️"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ownStatus?.label ?? "等待更新" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTab("settings"),
									children: "更新状态"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "status-card partner",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "status-emoji",
									children: partnerStatus?.emoji ?? "🌙"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: partnerName }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: partnerStatus?.label ?? "还没有更新" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: partnerStatus ? relativeTime(partnerStatus.updatedAt) : "等待他的消息" })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "miss-you",
						disabled: loading,
						type: "button",
						onClick: () => mutate({
							type: "poke",
							role
						}, `已经把想念送给${partnerName}`),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "heart",
							children: "♥"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "想你了" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							"今天已经互相想念 ",
							data.pokesToday,
							" 次"
						] })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "section-heading row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "最近的留言" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "每句话都会被好好收着" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setTab("notes"),
							children: "全部"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "message-preview",
						children: [data.messages.slice(0, 2).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.author === "first" ? "☀️" : "🌙" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.author === role ? name : partnerName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.content }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: relativeTime(item.createdAt) })
						] })] }, item.id)), !data.messages.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "empty",
							children: "第一句温柔的话，等你来写。"
						})]
					})
				]
			}),
			tab === "notes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content subpage",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "page-title",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "OUR NOTES"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "写给彼此的话" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "普通的一天，也值得留下几句话。" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "composer",
						onSubmit: (event) => {
							event.preventDefault();
							if (!message.trim()) return;
							mutate({
								type: "message",
								role,
								content: message
							}, "留言已经收好");
							setMessage("");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: message,
							onChange: (event) => setMessage(event.target.value),
							placeholder: `想对${partnerName}说点什么…`,
							maxLength: 240
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: loading || !message.trim(),
							children: "留下这句话"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "timeline",
						children: data.messages.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "timeline-dot",
							children: item.author === "first" ? "☀️" : "🌙"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: relativeTime(item.createdAt) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.content })] })] }, item.id))
					})
				]
			}),
			tab === "wishes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content subpage",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "page-title",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "OUR WISH LIST"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "以后一起完成" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "把“有一天”慢慢变成“这一天”。" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "wish-form",
						onSubmit: (event) => {
							event.preventDefault();
							if (!wish.trim()) return;
							mutate({
								type: "wish",
								role,
								title: wish
							}, "心愿已经加入");
							setWish("");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: wish,
							onChange: (event) => setWish(event.target.value),
							placeholder: "比如：一起去看海",
							maxLength: 80
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: loading || !wish.trim(),
							children: "＋"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wish-list",
						children: [data.wishes.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: item.completed ? "done" : "",
							type: "button",
							onClick: () => mutate({
								type: "toggleWish",
								id: item.id
							}, item.completed ? "重新放回心愿单" : "一起完成了一件事"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "wish-number",
									children: String(index + 1).padStart(2, "0")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "check",
									children: item.completed ? "✓" : ""
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.author === "first" ? "☀️" : "🌙" })
							]
						}, item.id)), !data.wishes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "empty",
							children: "写下第一件想一起完成的事吧。"
						})]
					})
				]
			}),
			tab === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content subpage",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "page-title",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "RIGHT NOW"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "更新我的状态" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "让对方安心，也让想念有回音。" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mood-list",
						children: moods.map((mood) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: ownStatus?.label === mood.label ? "active" : "",
							type: "button",
							onClick: () => mutate({
								type: "status",
								role,
								...mood
							}, "状态已经更新"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: mood.emoji }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: mood.label }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: ownStatus?.label === mood.label ? "当前状态" : "选择" })
							]
						}, mood.label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "install-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "＋" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "放到 iPhone 主屏幕" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "在 Safari 点“分享”，再选择“添加到主屏幕”。" })] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "bottom-nav",
				"aria-label": "主要导航",
				children: [
					[
						"home",
						"⌂",
						"此刻"
					],
					[
						"notes",
						"✎",
						"留言"
					],
					[
						"wishes",
						"☆",
						"心愿"
					],
					[
						"settings",
						"◌",
						"我的"
					]
				].map(([value, icon, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === value ? "active" : "",
					type: "button",
					onClick: () => setTab(value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: icon }), label]
				}, value))
			})
		]
	});
}
//#endregion
export { Home as default };
