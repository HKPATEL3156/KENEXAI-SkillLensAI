import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getQuestions, saveQuizCheckpoint, submitQuiz, getProfile } from "../services/api";

// Helpers: create an initials SVG data URL for fallback avatar
function initialsAvatarDataUrl(name, size = 128) {
	const initials = (name || 'C')
		.split(' ')
		.map((s) => s[0] || '')
		.slice(0, 2)
		.join('')
		.toUpperCase();

	// Pick a muted professional background color from a small palette
	const colors = ['#4F46E5', '#0F172A', '#1E293B', '#0EA5A4', '#4338CA', '#064E3B'];
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
	const bg = colors[Math.abs(hash) % colors.length];
	const fg = '#FFFFFF';

	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><rect width='100%' height='100%' fill='${bg}' rx='16' ry='16'/><text x='50%' y='50%' dy='.36em' text-anchor='middle' font-family='Inter, Roboto, Arial, sans-serif' font-size='${Math.floor(
		size / 2
	)}' fill='${fg}'>${initials}</text></svg>`;
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizePhotoString(photo) {
	if (!photo) return null;
	if (typeof photo !== 'string') return null;
	// already a data URL
	if (photo.startsWith('data:')) return photo;
	// looks like base64 without data prefix (common in some APIs)
	const base64Regex = /^[A-Za-z0-9+/=\n\r]+$/;
	if (photo.length > 100 && base64Regex.test(photo.replace(/\s+/g, ''))) {
		// assume png
		return `data:image/png;base64,${photo.replace(/\s+/g, '')}`;
	}
	// relative path -> absolute
	if (photo.startsWith('/')) {
		try {
			return window.location.origin + photo;
		} catch (e) {
			return photo;
		}
	}
	return photo; // likely absolute URL
}

function formatTime(seconds) {
	const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
	const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
	const s = String(seconds % 60).padStart(2, "0");
	return `${h}:${m}:${s}`;
}

function arraysEqual(a = [], b = []) {
	if (a.length !== b.length) return false;
	const aa = [...a].sort();
	const bb = [...b].sort();
	return aa.every((v, i) => v === bb[i]);
}

export default function QuizPage() {
	const navigate = useNavigate();
	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [current, setCurrent] = useState(0);
	const [answers, setAnswers] = useState({}); // { qid: [optionKeys] }
	const [marked, setMarked] = useState(new Set());
	const [visited, setVisited] = useState(new Set());
	const [attemptId, setAttemptId] = useState(null);

	// instruction flow
	const [showInstructions, setShowInstructions] = useState(true);
	const [acknowledged, setAcknowledged] = useState(false);

	// timer
	const [timeLeft, setTimeLeft] = useState(null); // seconds
	const [running, setRunning] = useState(false);

	const [user, setUser] = useState({ name: "Candidate", photo: "/profile.png" });
	const [submitted, setSubmitted] = useState(false);
	const [warningsUsed, setWarningsUsed] = useState(0);
	const [cheatingDetected, setCheatingDetected] = useState(false);
	const [showWarningModal, setShowWarningModal] = useState(false);
	const [warningRemaining, setWarningRemaining] = useState(3);
	const [warningReason, setWarningReason] = useState('');
	const [interfaceLocked, setInterfaceLocked] = useState(false);
	const [showTerminatedModal, setShowTerminatedModal] = useState(false);
	const lastViolationRef = useRef(0);
	const [showExitModal, setShowExitModal] = useState(false);
	const [showSubmitModal, setShowSubmitModal] = useState(false);

	const questionScrollRef = useRef(null);

	// get attemptId from query string
	useEffect(() => {
		const qs = new URLSearchParams(window.location.search);
		const a = qs.get("attemptId");
		if (a) setAttemptId(a);
	}, []);

	// fetch questions and user
	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const resp = await getQuestions(attemptId);
				const qs = resp.data.questions || [];
				setQuestions(qs);
			} catch (e) {
				console.error(e);
				setQuestions([]);
			}
			// Fetch profile with robust fallbacks for field names
			try {
				const prof = await getProfile();
				if (prof && prof.data) {
					const p = prof.data;
					const name = p.name || p.fullName || p.displayName || p.email || "Candidate";
					let photoRaw = p.profileImage || p.photo || p.avatar || p.image || p.profilePicture || p.picture || p.photoUrl || null;
					let photo = normalizePhotoString(photoRaw) || null;
					if (!photo) {
						// use initials SVG data URL
						photo = initialsAvatarDataUrl(name, 128);
					}
					setUser({ name, photo });
				}
			} catch (e) {
				// fallback: derive initials avatar
				setUser((u) => ({ ...u, photo: initialsAvatarDataUrl(u.name || 'Candidate', 128) }));
			}
			setLoading(false);
		};
		load();
	}, [attemptId]);

	// Initialize warnings from session storage for this attempt
	useEffect(() => {
		if (!attemptId) return;
		const key = `exam_warnings_${attemptId}`;
		const stored = sessionStorage.getItem(key);
		if (stored) {
			try { const n = parseInt(stored, 10); if (!Number.isNaN(n)) setWarningsUsed(n); } catch (e) {}
		}
		return () => {};
	}, [attemptId]);

	// prevent page scroll and warn on unload
	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const handler = (e) => {
			e.preventDefault();
			e.returnValue = "Do not refresh or leave the exam.";
		};
		window.addEventListener("beforeunload", handler);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("beforeunload", handler);
		};
	}, []);


	// Anti-cheating: handlers for visibility, blur, fullscreen exit, right-click, and copy shortcuts
	useEffect(() => {
		if (!attemptId) return;
		let mounted = true;

		const recordWarnings = (reason) => {
			if (!mounted) return;
			if (!running) return; // only while exam running
			if (submitted || interfaceLocked) return;
			// debounce rapid repeated events
			const now = Date.now();
			if (now - (lastViolationRef.current || 0) < 2000) return;
			lastViolationRef.current = now;
			// increment and persist
			setWarningsUsed((prev) => {
				const next = prev + 1;
				try { sessionStorage.setItem(`exam_warnings_${attemptId}`, String(next)); } catch (e) {}
				setWarningRemaining(Math.max(0, 3 - next));
				setWarningReason(reason || 'Suspicious activity');
				// show modal for first 3 warnings
				setShowWarningModal(true);
				// if exceeded threshold -> auto submit
				if (next > 3) {
					// auto submit due to cheating
					setInterfaceLocked(true);
					setCheatingDetected(true);
					// stop timer
					setRunning(false);
					// show terminated modal after submit
					// call submit with cheating flag
					doSubmit(true, { cheatingDetected: true, submissionStatus: 'auto-submitted-cheating', warningsUsed: next }).then(() => {
						setShowTerminatedModal(true);
					}).catch(()=>{
						setShowTerminatedModal(true);
					});
				}
				return next;
			});
		};

		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible') recordWarnings('Tab switch / visibility lost');
		};
		const onBlur = () => {
			recordWarnings('Window blur / focus lost');
		};
		const onFullscreenChange = () => {
			if (!document.fullscreenElement) {
				recordWarnings('Exited fullscreen');
			}
		};
		const onContextMenu = (e) => {
			// disable right click during exam
			if (running && !submitted && !interfaceLocked) {
				e.preventDefault();
				recordWarnings('Right click');
			}
		};
		const onKeydown = (e) => {
			if (!running || submitted || interfaceLocked) return;
			const ctrl = e.ctrlKey || e.metaKey;
			if (ctrl && ['c','v','a','C','V','A'].includes(e.key)) {
				e.preventDefault();
				recordWarnings('Copy/Paste/Select All shortcut');
			}
			// F11 or ESC to exit fullscreen may be caught by fullscreenchange
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('blur', onBlur);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		document.addEventListener('contextmenu', onContextMenu);
		window.addEventListener('keydown', onKeydown, true);

		// Force fullscreen at start
		try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); } catch (e) {}

		return () => {
			mounted = false;
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			document.removeEventListener('contextmenu', onContextMenu);
			window.removeEventListener('keydown', onKeydown, true);
		};
	}, [attemptId, running, submitted, interfaceLocked]);

	// Timer interval
	useEffect(() => {
		if (!running) return;
		if (timeLeft == null) return;
		if (timeLeft <= 0) {
			handleAutoSubmit();
			return;
		}
		const id = setInterval(() => {
			setTimeLeft((t) => (t ? t - 1 : 0));
		}, 1000);
		return () => clearInterval(id);
	}, [running, timeLeft]);

	// autosave to backend (debounced)
	useEffect(() => {
		if (!attemptId) return;
		const to = setTimeout(async () => {
			try {
				await saveQuizCheckpoint({ attemptId, checkpoint: { answers, marked: Array.from(marked), current, timeLeft } });
			} catch (e) {}
		}, 800);
		return () => clearTimeout(to);
	}, [answers, marked, current, timeLeft, attemptId]);

	function enterFullScreen() {
		try {
			const el = document.documentElement;
			if (el.requestFullscreen) el.requestFullscreen();
			else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
		} catch (e) {}
	}

	async function startExam() {
		// acknowledge then start timer and full-screen
		enterFullScreen();
		setShowInstructions(false);
		setRunning(true);
		setTimeLeft(60 * 60); // 1 hour
		// mark visited first question
		if (questions && questions.length > 0) {
			const q = questions[0];
			const qid = q.id ?? q.questionId ?? String(1);
			setVisited((s) => new Set(s).add(qid));
		}
	}

	function markVisited(qid) {
		setVisited((s) => new Set(s).add(qid));
	}

	function gotoQuestion(index) {
		if (index < 0 || index >= questions.length) return;
		setCurrent(index);
		const q = questions[index];
		const qid = q.id ?? q.questionId ?? String(index + 1);
		markVisited(qid);
		if (questionScrollRef.current) questionScrollRef.current.scrollTop = 0;
	}

	function nextQuestion() {
		gotoQuestion(Math.min(questions.length - 1, current + 1));
	}
	function prevQuestion() {
		gotoQuestion(Math.max(0, current - 1));
	}

	function handleSelectOption(q, key) {
		if (submitted || interfaceLocked) return;
		const qid = q.id ?? q.questionId ?? String(current + 1);
		setVisited((s) => new Set(s).add(qid));
		setAnswers((prev) => {
			const next = { ...prev };
			const isMSQ = (q.type || "MCQ").toUpperCase() === "MSQ";
			const currentSel = Array.isArray(next[qid]) ? [...next[qid]] : [];
			if (isMSQ) {
				if (currentSel.includes(key)) {
					// unselect
					next[qid] = currentSel.filter((k) => k !== key);
				} else {
					next[qid] = [...currentSel, key];
				}
			} else {
				// single select
				next[qid] = [key];
			}
			return next;
		});
	}

	function handleClearResponse(q) {
		const qid = q.id ?? q.questionId ?? String(current + 1);
		setAnswers((prev) => {
			const next = { ...prev };
			delete next[qid];
			return next;
		});
	}

	function handleMarkForReview(q) {
		const qid = q.id ?? q.questionId ?? String(current + 1);
		setMarked((prev) => {
			const s = new Set(prev);
			if (s.has(qid)) s.delete(qid);
			else s.add(qid);
			return s;
		});
		// jump to next question for quick workflow
		const next = Math.min(questions.length - 1, current + 1);
		if (next !== current) gotoQuestion(next);
	}

	async function handleAutoSubmit() {
		if (submitted) return;
		await doSubmit(true);
	}

	async function doSubmit(isAuto = false, callerOpts = {}) {
		// Clear console logs and mark submission in progress
		try { console.clear(); } catch (e) {}
		// Use a transient submitting flag to avoid prematurely locking UI
		// and to allow canceling modals without marking as submitted.
		const MARKS_PER_QUESTION = 4;
		const total = questions.length;
		const attempted = Object.keys(answers).length;
		const notAttempted = total - attempted;
		const markedForReview = marked.size;

		let totalObtained = 0;
		const resultAnswers = questions.map((q) => {
			const qid = q.id ?? q.questionId ?? String((q.index ?? 0) + 1);
			const sel = Array.isArray(answers[qid]) ? answers[qid] : [];
			const correct = Array.isArray(q.correct) ? q.correct : (q.correct ? [q.correct] : []);
			let obtained = 0;
			if (correct.length === 0) {
				obtained = 0;
			} else {
				// treat values as strings for comparison stability
				const correctSet = new Set(correct.map((c) => String(c)));
				const selSet = new Set((sel || []).map((s) => String(s)));
				// count correctly selected options
				let correctSelected = 0;
				for (const c of correctSet) if (selSet.has(c)) correctSelected++;

				// Choose marking scheme per-question (fallback to 'simple')
				const scheme = (q.marking && q.marking.scheme) || q.markingScheme || (q.partialMarking ? 'partial' : 'simple');

				// MCQ (single correct) - require exact match
				if (correctSet.size === 1) {
					const single = Array.from(correctSet)[0];
					obtained = (selSet.size === 1 && selSet.has(single)) ? MARKS_PER_QUESTION : 0;
				} else {
					// MSQ rules as requested by product:
					// - Simple (default): If any incorrect option selected -> 0
					//   Otherwise award proportion: (correctSelected / totalCorrect) * full marks
					// - Partial (optional): per-correct option share = MARKS_PER_QUESTION / totalCorrect
					//   (still zero if any incorrect option selected unless question.allowsWrongPartial true)
					const hasWrong = Array.from(selSet).some(s => !correctSet.has(s));
					if (scheme === 'partial') {
						if (hasWrong && !q.allowsWrongPartial) {
							obtained = 0;
						} else {
							obtained = (correctSelected / correctSet.size) * MARKS_PER_QUESTION;
						}
					} else {
						// 'simple' or unknown
						if (hasWrong) obtained = 0;
						else obtained = (correctSelected / correctSet.size) * MARKS_PER_QUESTION;
					}
				}
			}
			totalObtained += obtained;
			return { questionId: qid, selectedOptions: sel, obtainedMarks: Number(obtained.toFixed(2)) };
		});

		const maxMarks = total * MARKS_PER_QUESTION;
		const percentage = maxMarks > 0 ? Math.round((totalObtained / maxMarks) * 100) : 0;

		const warningsCount = (typeof window !== 'undefined' && attemptId) ? (parseInt(sessionStorage.getItem(`exam_warnings_${attemptId}`), 10) || warningsUsed) : warningsUsed;
		const payload = {
			sessionId: attemptId || "",
			totalQuestions: total,
			attempted,
			notAttempted,
			markedForReview,
			warningsUsed: warningsCount,
			cheatingDetected: false,
			submissionStatus: 'normal',
			score: Number(totalObtained.toFixed(2)),
			percentage,
			answers: resultAnswers,
		};

		// apply caller-provided overrides (internal use)
		if (callerOpts.warningsUsed !== undefined) payload.warningsUsed = callerOpts.warningsUsed;
		if (callerOpts.cheatingDetected) {
			payload.cheatingDetected = true;
			payload.submissionStatus = callerOpts.submissionStatus || 'auto-submitted-cheating';
		}

		// lock UI to prevent further interaction while submission is in progress
		setInterfaceLocked(true);
		setSubmitted(true);
		try {
			await submitQuiz({ attemptId, obtainedMarks: Number(totalObtained.toFixed(2)), totalMarks: maxMarks, status: payload.cheatingDetected ? 'auto-submitted-cheating' : 'submitted', answersSummary: payload });
		} catch (e) {
			console.error(e);
		}

		// exit fullscreen and redirect to coach dashboard showing results
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
		} catch (e) {}

		// pass summary via navigation state
		navigate("/dashboard/coach", { state: { result: payload } });
	}

	if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading exam…</div>;

	if (!questions || questions.length === 0) return <div className="h-screen w-screen flex items-center justify-center">No questions available.</div>;

	const total = questions.length;
	const answeredCount = Object.keys(answers).length;

	const q = questions[current];
	const qid = q.id ?? q.questionId ?? String(current + 1);
	const selected = answers[qid] ?? [];

	return (
		<div className="h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
			{/* Instructions modal (first) */}
			{showInstructions && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-8 mx-4">
						<h2 className="text-2xl font-semibold mb-4">Exam Instructions — Please Read Carefully</h2>
						<div className="text-sm text-gray-700 space-y-3 mb-4">
							<p><strong>Total Questions:</strong> {total}</p>
							<p><strong>Duration:</strong> 1 hour (the timer begins when you start the exam).</p>
							<p><strong>Navigation:</strong> Use the question palette on the right to jump between questions. Use the footer controls to move to previous/next questions. Your selected answers are saved automatically.</p>
							<p><strong>Answering:</strong> MCQ = one option; MSQ = multiple options allowed. Click an option to select/unselect. Use <em>Clear</em> to remove selections.</p>
							<p><strong>Mark For Review:</strong> Use this to flag questions you want to revisit. Marked questions are not automatically submitted — they are included with your answers.</p>
							<p><strong>Autosave:</strong> Your answers are autosaved periodically. Still, avoid refreshing the page or closing the browser until you exit via the portal.</p>
							<p><strong>Prohibited Actions:</strong> Do not open multiple tabs/windows for this exam. Switching tabs or refreshing may interrupt the timer — the system may log such events.</p>
							<p><strong>Submission:</strong> When the timer ends the exam will be auto-submitted. You can also submit anytime from the footer — you'll see a confirmation with your attempt summary before final submission.</p>
							<p><strong>Support:</strong> If you face any technical issues, contact proctor/support immediately and include your session id shown in the header.</p>
						</div>
						<label className="flex items-center gap-3 mb-4">
							<input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="form-checkbox h-4 w-4" />
							<span className="text-sm">I have read, understood, and agree to follow the above instructions.</span>
						</label>
						<div className="flex justify-between items-center">
							<div className="text-xs text-gray-500">Session ID: <strong>{attemptId || 'N/A'}</strong></div>
							<div className="flex justify-end gap-3">
								<button className="px-4 py-2 rounded bg-gray-200" onClick={() => { navigate(-1); }}>Cancel</button>
								<button disabled={!acknowledged} onClick={startExam} className={`px-4 py-2 rounded text-white ${acknowledged ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}`}>Start Exam</button>
							</div>
						</div>
					</div>

					{/* Simple testing: show correct option letters (A, B, C...) */}
					<div className="mt-2 text-xs text-green-700">Correct ans: {(() => {
						const keys = q.options ? Object.keys(q.options) : [];
						const map = {};
						keys.forEach((k,i) => { map[k] = String.fromCharCode(65 + i); });
						const correct = Array.isArray(q.correct) ? q.correct : (q.correct ? [q.correct] : []);
						if (!correct || correct.length === 0) return 'N/A';
						return correct.map(c => map[c] ?? String(c)).join(' ');
					})()}</div>
				</div>
			)}

			{/* Header */}
			<header className="fixed top-0 left-0 right-0 bg-white border-b z-40">
				<div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
					<div className="w-1/3 flex items-center gap-3">
						{/* Use site logo (place at /logo.png). No circular wrapper */}
						<img src="/logo.png" alt="SkillLens logo" className="h-10 w-10 object-cover shadow-sm" onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src='/profile.png';}} />
						<div>
							<div className="text-lg font-semibold">SkillLens AI</div>
							<div className="text-xs text-gray-500">Skill Evaluation — Exam Portal</div>
						</div>
					</div>
					<div className="w-1/3 text-center">
						<div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-gray-100">
							<div className={`font-mono font-semibold ${timeLeft !== null && timeLeft <= 300 ? 'text-red-600' : 'text-gray-900'}`}>{formatTime(timeLeft ?? 0)}</div>
							<div className="text-xs text-gray-500">Time Remaining</div>
						</div>
					</div>
					<div className="w-1/3 text-right flex items-center justify-end gap-3">
						<div className="text-right mr-2">
							<div className="font-medium truncate max-w-[220px]">{user.name}</div>
							<div className="text-xs text-gray-500">Session: {attemptId || 'N/A'}</div>
						</div>
						<img src={user.photo} alt="profile" onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src = initialsAvatarDataUrl(user.name || 'Candidate', 128);}} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100" />
					</div>
				</div>
			</header>

			{/* Main */}
			<main className="pt-20 pb-20 h-screen">
				<div className="max-w-7xl mx-auto px-6 h-full">
					<div className="flex h-full gap-6">
						{/* Left - Question area 75% */}
						<div className="flex-[3] h-full overflow-hidden">
							<div className="h-full bg-white rounded shadow p-6 flex flex-col">
								<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className="text-sm text-gray-600">Question</div>
											<div className="text-lg font-semibold">{current + 1} / {total}</div>
										</div>
								</div>

								<div ref={questionScrollRef} className="mt-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
									{q.scenario && <div className="mb-3 p-3 bg-gray-50 rounded text-sm text-gray-700">{q.scenario}</div>}

									<div className="mb-4 text-base leading-relaxed text-gray-900">{q.text || q.question}</div>

									{q.code && (
										<pre className="bg-gray-900 text-gray-100 rounded p-3 overflow-auto whitespace-pre text-sm mb-4" style={{ maxHeight: '220px' }}>
											<code>{q.code}</code>
										</pre>
									)}

									<div className="grid gap-3">
										{q.options && Object.entries(q.options).map(([key, text]) => {
											const isSelected = selected.includes(key);
											const correctArr = Array.isArray(q.correct) ? q.correct : (q.correct ? [q.correct] : []);
											const isCorrect = correctArr.includes(key);
											return (
												<button key={key} onClick={() => handleSelectOption(q, key)} className={`w-full text-left px-4 py-3 rounded border ${isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900 hover:bg-gray-50'} focus:outline-none`}>
													<div className="flex items-start gap-3">
														<div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-700'}`}>{key}</div>
														<div className="flex-1 text-sm flex items-center justify-between">
															<div>{text}</div>
															{isCorrect && (
																<div className="ml-4 text-xs text-green-700 font-semibold">Correct</div>
															)}
														</div>
													</div>
												</button>
											);
										})}
									</div>
								</div>

								{/* Controls moved to footer for consistent placement */}
							</div>
						</div>

						{/* Right - Palette 25% */}
						<aside className="flex-[1] h-full">
							<div className="sticky top-28 bg-white rounded shadow p-4" style={{ maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>
								<div className="flex items-center justify-between mb-3">
									<div className="text-sm font-medium">Question Palette</div>
									<div className="text-xs text-gray-500">{answeredCount}/{total} answered</div>
								</div>

								{/* Legend */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start text-xs mb-3">
									{/* legend items as small numbered boxes for clear visual mapping */}
									{[
										{ key: 'unseen', label: 'Unseen', bg: '#E5E7EB', color: '#374151', border: '#9CA3AF' },
										{ key: 'visited', label: 'Visited - Not Answered', bg: '#FECACA', color: '#7F1D1D', border: '#F87171' },
										{ key: 'answered', label: 'Answered', bg: '#22C55E', color: '#FFFFFF', border: '#15803D' },
										{ key: 'marked', label: 'Marked for Review', bg: '#FACC15', color: '#1F2937', border: '#B45309' },
										{ key: 'answeredMarked', label: 'Answered + Marked', bg: '#7C3AED', color: '#FFFFFF', border: '#4C1D95' },
									].map((it) => (
										<div key={it.key} className="flex items-center gap-3">
											<span
												className="flex items-center justify-center rounded-md shadow-sm"
												style={{ width: 28, height: 28, backgroundColor: it.bg, color: it.color, border: `1px solid ${it.border}`, fontSize: 12, fontWeight: 600 }}
											>
												1
											</span>
											<span className="text-gray-600 leading-tight">{it.label}</span>
										</div>
									))}
								</div>

								{/* Palette grid */}

								<div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 gap-2 mb-3">
									{questions.map((qq, i) => {
										const id = qq.id ?? qq.questionId ?? String(i+1);
										const isAnswered = Array.isArray(answers[id]) && answers[id].length > 0;
										const isMarked = marked.has(id);
										const isVisited = visited.has(id);
										// Determine visual state priority
										let bg = '#E5E7EB';
										let color = '#374151';
										let border = '#9CA3AF';
										if (isAnswered && isMarked) {
											bg = '#7C3AED'; color = '#FFFFFF'; border = '#4C1D95';
										} else if (isMarked && !isAnswered) {
											bg = '#FACC15'; color = '#1F2937'; border = '#B45309';
										} else if (isAnswered) {
											bg = '#22C55E'; color = '#FFFFFF'; border = '#15803D';
										} else if (isVisited && !isAnswered) {
											bg = '#FECACA'; color = '#7F1D1D'; border = '#F87171';
										} else {
											bg = '#E5E7EB'; color = '#374151'; border = '#9CA3AF';
										}
										return (
											<button
												key={id}
												onClick={() => gotoQuestion(i)}
												aria-label={`Question ${i+1} - ${isAnswered ? 'Answered' : isMarked ? 'Marked' : isVisited ? 'Visited' : 'Unseen'}`}
												title={`Question ${i+1}`}
												className="flex items-center justify-center rounded-md shadow-sm transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-90"
												style={{ width: 44, height: 44, backgroundColor: bg, color, border: `1px solid ${border}`, fontSize: 14 }}
											>
												<span className="font-semibold">{i+1}</span>
											</button>
										);
									})}
								</div>

								<div className="text-sm space-y-1">
									<div>Total Questions: {total}</div>
									<div>Answered: {answeredCount}</div>
									<div>Marked: {marked.size}</div>
									<div>Remaining: {total - answeredCount}</div>
								</div>
							</div>
						</aside>
					</div>
				</div>
			</main>

			{/* Exit modal */}
			{/* Warning modal for suspicious activity (professional dialog) */}
			{showWarningModal && (
				<div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
					<div className="bg-white rounded-lg shadow-2xl w-full max-w-xl p-6 mx-4" onClick={(e)=>e.stopPropagation()}>
						<h3 className="text-xl font-semibold mb-2">Warning – Suspicious Activity Detected</h3>
						<p className="text-sm text-gray-700 mb-4">We detected that you left the exam screen. This may be considered cheating. You have <span className="font-semibold">{warningRemaining}</span> warnings remaining. If you exceed 3 warnings, your exam will be automatically submitted.</p>
						<div className="flex justify-end gap-3">
							<button className="px-4 py-2 rounded bg-white border" onClick={() => { setShowWarningModal(false); }}>I will not repeat this</button>
							<button className="px-4 py-2 rounded bg-red-600 text-white" onClick={async () => {
								setShowWarningModal(false);
								setCheatingDetected(true);
								setInterfaceLocked(true);
								setRunning(false);
								const warningsCount = parseInt(sessionStorage.getItem(`exam_warnings_${attemptId}`), 10) || warningsUsed;
								await doSubmit(false, { cheatingDetected: true, submissionStatus: 'auto-submitted-cheating', warningsUsed: warningsCount });
							}}>
								Exit Exam
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Terminated modal shown after auto-submit due to cheating */}
			{showTerminatedModal && (
				<div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
					<div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e)=>e.stopPropagation()}>
						<h3 className="text-xl font-semibold mb-2 text-red-600">Exam Terminated</h3>
						<p className="text-sm text-gray-700 mb-4">You have exceeded the maximum allowed violations. Your exam has been automatically submitted due to suspicious activity.</p>
						<div className="flex justify-end">
							<button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={() => { setShowTerminatedModal(false); navigate('/dashboard/coach'); }}>View Report</button>
						</div>
					</div>
				</div>
			)}

			{/* Interaction-blocking overlay when interface is locked (submission in progress) */}
			{interfaceLocked && !showTerminatedModal && (
				<div className="fixed inset-0 z-80 bg-black bg-opacity-30 flex items-center justify-center">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-lg font-semibold">Submitting exam…</div>
						<div className="text-sm text-gray-600 mt-2">Your submission is being processed due to policy violation.</div>
					</div>
				</div>
			)}
			{showExitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
						<h3 className="text-lg font-semibold mb-4">Exit Exam</h3>
						<div className="grid grid-cols-2 gap-3 text-sm mb-4">
							<div>Attempted: <strong>{Object.keys(answers).length}</strong></div>
							<div>Remaining: <strong>{total - Object.keys(answers).length}</strong></div>
							<div>Marked for review: <strong>{marked.size}</strong></div>
							<div>Visited: <strong>{visited.size}</strong></div>
						</div>
						<div className="flex justify-end gap-3">
							<button className="px-4 py-2 rounded bg-white border" onClick={() => setShowExitModal(false)}>Cancel</button>
							<button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={async () => {
								// save checkpoint then exit
								try {
									await saveQuizCheckpoint({ attemptId, checkpoint: { answers, marked: Array.from(marked), current, timeLeft } });
								} catch (e) {}
								setShowExitModal(false);
								navigate('/dashboard/coach');
							}}>Save & Exit</button>
						</div>
					</div>
				</div>
			)}

			{/* Submit modal */}
			{showSubmitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
						<h3 className="text-lg font-semibold mb-4">Submit Exam</h3>
						<div className="text-sm mb-4">
							<p>Total Questions: <strong>{total}</strong></p>
							<p>Attempted: <strong>{Object.keys(answers).length}</strong></p>
							<p>Marked for review: <strong>{marked.size}</strong></p>
							<p>Remaining: <strong>{total - Object.keys(answers).length}</strong></p>
							<p className="mt-3 text-red-600">Once you confirm submission you will not be able to change your answers.</p>
						</div>
						<div className="flex justify-end gap-3">
							<button className="px-4 py-2 rounded bg-white border" onClick={() => setShowSubmitModal(false)}>Cancel</button>
							<button className="px-4 py-2 rounded bg-red-600 text-white" onClick={async () => {
								setShowSubmitModal(false);
								await doSubmit(false);
							}}>Confirm Submit</button>
						</div>
					</div>
				</div>
			)}

			{/* Footer fixed */}
			<footer className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
				<div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={prevQuestion} disabled={current===0 || submitted || interfaceLocked} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Previous</button>
						<button onClick={() => gotoQuestion(0)} className="px-4 py-2 rounded bg-white border">First</button>
					</div>

					<div className="flex items-center gap-2">
						<button onClick={() => handleClearResponse(q)} disabled={submitted || interfaceLocked} className="px-4 py-2 rounded bg-white border">Clear</button>
							<button onClick={() => handleMarkForReview(q)} disabled={submitted || interfaceLocked} className="px-4 py-2 rounded bg-yellow-100">Mark for Review</button>
							<button onClick={() => gotoQuestion(Math.min(total-1, current+1))} disabled={submitted || interfaceLocked} className="px-4 py-2 rounded bg-blue-600 text-white">Save & Next</button>
					</div>

					<div className="flex items-center gap-2">
						<button onClick={() => setShowSubmitModal(true)} disabled={submitted || interfaceLocked} className="px-4 py-2 rounded bg-red-600 text-white">Submit Exam</button>
						<button onClick={() => setShowExitModal(true)} className="px-4 py-2 rounded bg-gray-800 text-white">Exit Exam</button>
					</div>
				</div>
			</footer>
		</div>
		);
	}

