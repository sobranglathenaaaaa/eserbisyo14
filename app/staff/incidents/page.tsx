"use client";

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import PortalShell from '../../../components/portal-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { EmptyState, FormFeedback, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { copyText } from '@/features/resident/model/copy';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel, relativeTime } from '@/lib/formatters';
import { updateReportStatus } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

type ReportFilter = 'all' | 'pending' | 'under_review' | 'resolved';

const reportFilterOptions: Array<{ value: ReportFilter; label: string }> = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'under_review', label: 'Under Review' },
];

export default function StaffIncidentsPage() {
	const { state, locale } = useAppState();
	const pageCopy = getRolePageCopy('staff/incidents');
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<ReportFilter>('pending');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [reviewOpen, setReviewOpen] = useState(false);
	const [reviewNote, setReviewNote] = useState('');
	const [processingStatus, setProcessingStatus] = useState<ReportFilter | 'none'>('none');
	const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

	const reports = useMemo(
		() => state.reports.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
		[state.reports]
	);

	const counts = useMemo(
		() => ({
			pending: reports.filter((item) => item.status === 'pending').length,
			under_review: reports.filter((item) => item.status === 'under_review').length,
		}),
		[reports]
	);

	const filteredReports = useMemo(() => {
		const query = search.trim().toLowerCase();
		return reports.filter((item) => {
			if (item.status !== filter) return false;
			if (!query) return true;
			return [item.id, item.details, item.location, item.residentName, item.kind, item.otherCategoryText ?? '']
				.join(' ')
				.toLowerCase()
				.includes(query);
		});
	}, [filter, reports, search]);

	const selectedReport = useMemo(() => {
		return filteredReports.find((item) => item.id === selectedId) ?? filteredReports[0] ?? reports[0] ?? null;
	}, [filteredReports, reports, selectedId]);

	useEffect(() => {
		if (!selectedReport) {
			setSelectedId(null);
			return;
		}
		if (selectedId !== selectedReport.id) {
			setSelectedId(selectedReport.id);
		}
	}, [selectedId, selectedReport]);

	useEffect(() => {
		if (!feedback) return;
		const timeoutId = window.setTimeout(() => setFeedback(null), 5000);
		return () => window.clearTimeout(timeoutId);
	}, [feedback]);

	useEffect(() => {
		if (!reviewOpen) return;
		setReviewNote('');
	}, [reviewOpen, selectedReport?.id]);

	const openReview = (reportId: string) => {
		setSelectedId(reportId);
		setReviewNote('');
		setReviewOpen(true);
	};

	const closeReview = () => {
		setReviewOpen(false);
		setReviewNote('');
		setProcessingStatus('none');
	};

	const applyStatusUpdate = async (status: 'under_review') => {
		if (!selectedReport) return;
		setProcessingStatus(status);
		try {
			await updateReportStatus(selectedReport.id, status, reviewNote.trim() || undefined);
			setFeedback({
				tone: 'success',
				text:
					status === 'under_review'
						? locale === 'fil'
							? 'Na-move na sa under review ang report.'
							: 'The report was moved to under review.'
						: locale === 'fil'
							? 'Na-mark na bilang resolved ang report.'
							: 'The report was marked as resolved.',
			});
			closeReview();
		} catch (error) {
			setFeedback({
				tone: 'error',
				text: error instanceof Error ? error.message : 'Unable to update incident report status.',
			});
		} finally {
			setProcessingStatus('none');
		}
	};

	return (
		<PortalShell role="staff" title={pageCopy.title} description={pageCopy.description} showHero={false}>
			{pageCopy.guide ? (
				<PageGuide
					title={resolveRoleCopy(locale, pageCopy.guide.title)}
					summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
					steps={resolveSteps(locale, pageCopy.guide.steps)}
					cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
				/>
			) : null}

			{feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
				<SectionCard title={locale === 'fil' ? 'Mga Incident Report' : 'Incident Reports'}>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder={locale === 'fil' ? 'Hanapin: pangalan, lokasyon' : 'Search: name, location'}
							className="max-w-[460px]"
						/>

						<div className="flex flex-wrap gap-2">
							{reportFilterOptions.map((option) => {
								const isActive = filter === option.value;
								const count = counts[option.value];
								return (
									<Button
										key={option.value}
										type="button"
										size="sm"
										variant={isActive ? 'residentOutline' : 'secondary'}
										onClick={() => setFilter(option.value)}
									>
										{locale === 'fil' ? option.label : option.label} ({count})
									</Button>
								);
							})}
						</div>
					</div>

					<div className="mt-4 overflow-hidden rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)]">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[980px] text-sm">
								<thead>
									<tr className="border-b border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] text-[color:var(--portal-ink-700)]">
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Case / Reference' : 'Case / Reference'}</th>
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Resident' : 'Resident'}</th>
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Location' : 'Location'}</th>
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Status' : 'Status'}</th>
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Updated' : 'Updated'}</th>
										<th className="px-4 py-3 text-left font-semibold">{locale === 'fil' ? 'Action' : 'Action'}</th>
									</tr>
								</thead>
								<tbody>
									{filteredReports.length ? filteredReports.map((item) => {
										const isSelected = selectedReport?.id === item.id;
										return (
											<tr
												key={item.id}
												className={`cursor-pointer border-b border-[color:var(--portal-border-soft)] transition-colors hover:bg-[color:var(--portal-surface-2)] ${isSelected ? 'bg-[color:var(--portal-surface-3)]' : 'bg-white'}`}
												onClick={() => setSelectedId(item.id)}
											>
												<td className="px-4 py-4 align-middle text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--portal-ink-700)]">
													{formatIncidentCaseNumber(item.id, item.createdAt)}
												</td>
												<td className="px-4 py-4 align-middle text-[color:var(--portal-ink-900)]">{item.residentName}</td>
												<td className="px-4 py-4 align-middle text-[color:var(--portal-ink-900)]">{item.location}</td>
												<td className="px-4 py-4 align-middle">
													<StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
												</td>
												<td className="px-4 py-4 align-middle text-[color:var(--portal-ink-700)]">
													<div>{formatDateTime(item.updatedAt, locale)}</div>
													<p className="text-xs text-[color:var(--portal-ink-500)]">{relativeTime(item.updatedAt, locale)}</p>
												</td>
												<td className="px-4 py-4 align-middle">
													<Button
														type="button"
														size="sm"
														variant="residentOutline"
														onClick={(event) => {
															event.stopPropagation();
															openReview(item.id);
														}}
													>
														{locale === 'fil' ? 'Review' : 'Review'}
													</Button>
												</td>
											</tr>
										);
									}) : (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center">
												<EmptyState
													title={locale === 'fil' ? 'Walang report na tumutugma' : 'No matching reports'}
													description={copyText(
														locale,
														'Ayusin ang search o filter para makita ang ibang incident report.',
														'Adjust the search or filter to see other incident reports.'
													)}
												/>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</SectionCard>

				<div className="grid gap-5 self-start xl:sticky xl:top-6">
					<SectionCard title={locale === 'fil' ? 'Sidebar ng Report' : 'Report Sidebar'}>
						{selectedReport ? (
							<div className="grid gap-4">
								<div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">
												{formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt)}
											</p>
											<h2 className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">{selectedReport.title}</h2>
										</div>
										<StatusBadge tone={statusToneFromState(selectedReport.status)}>
											{getReportStatusLabel(selectedReport.status, locale)}
										</StatusBadge>
									</div>

									<div className="mt-3 grid gap-2 text-sm text-[color:var(--portal-ink-700)]">
										<p>{locale === 'fil' ? 'Resident' : 'Resident'}: {selectedReport.residentName}</p>
										<p>{locale === 'fil' ? 'Uri' : 'Type'}: {selectedReport.kind}{selectedReport.otherCategoryText ? `: ${selectedReport.otherCategoryText}` : ''}</p>
										<p>{locale === 'fil' ? 'Lokasyon' : 'Location'}: {selectedReport.location}</p>
										<p>{locale === 'fil' ? 'Petsa ng insidente' : 'Date of incident'}: {selectedReport.dateOfIncident}</p>
										<p>{locale === 'fil' ? 'Na-submit' : 'Submitted'}: {formatDateTime(selectedReport.createdAt, locale)}</p>
										<p>{locale === 'fil' ? 'Huling update' : 'Last updated'}: {formatDateTime(selectedReport.updatedAt, locale)}</p>
									</div>

									<p className="mt-4 text-sm leading-6 text-[color:var(--portal-ink-700)]">{selectedReport.details}</p>
								</div>

								<div className="grid gap-2">
									<Button type="button" variant="resident" onClick={() => openReview(selectedReport.id)}>
										{locale === 'fil' ? 'Buksan ang Review' : 'Open Review'}
									</Button>
									<Button type="button" variant="secondary" onClick={() => void updateReportStatus(selectedReport.id, 'under_review')}>
										{locale === 'fil' ? 'Mark Under Review' : 'Mark Under Review'}
									</Button>
								</div>
							</div>
						) : (
							<EmptyState
								title={locale === 'fil' ? 'Walang napiling report' : 'No report selected'}
								description={locale === 'fil' ? 'Pumili ng report para makita ang sidebar detail.' : 'Select a report to see the sidebar detail.'}
							/>
						)}
					</SectionCard>

					<Card className="rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[linear-gradient(180deg,#f8fcf8_0%,#eef7f1_100%)] p-4 shadow-[var(--portal-shadow-1)]">
						<p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{locale === 'fil' ? 'Tip' : 'Tip'}</p>
						<p className="mt-1 text-sm leading-6 text-[color:var(--portal-ink-700)]">
							{locale === 'fil'
								? 'Gamitin ang sidebar para sa mabilis na check, tapos i-click ang Review kapag kailangan mo ng full detail at action panel.'
								: 'Use the sidebar for a quick check, then click Review when you need the full detail and action panel.'}
						</p>
					</Card>
				</div>
			</div>

			<Dialog open={reviewOpen} onOpenChange={(open) => (open ? setReviewOpen(true) : closeReview())}>
				<DialogContent className="max-w-6xl overflow-hidden rounded-[28px] border border-[color:var(--portal-border-soft)] bg-[linear-gradient(180deg,#f4fbf6_0%,#ffffff_100%)] p-0 shadow-[0_28px_90px_rgba(10,45,25,0.25)]">
					<div className="flex items-center justify-between border-b border-[color:var(--portal-border-soft)] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-5 py-4 text-white">
						<div>
							<p className="text-xs uppercase tracking-[0.12em] text-white/75">
								{selectedReport ? formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt) : ''}
							</p>
							<DialogTitle className="mt-1 text-xl text-white">
								{locale === 'fil' ? 'Detail at Review ng Incident Report' : 'Incident Report Detail and Review'}
							</DialogTitle>
							<DialogDescription className="mt-1 text-white/80">
								{locale === 'fil'
									? 'Nasa popup na ang buong detail para hindi kumain ng space ang main page.'
									: 'The full detail lives in a popup so the main page stays compact.'}
							</DialogDescription>
						</div>
					</div>

					{selectedReport ? (
						<div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr]">
							<section className="grid gap-3">
								<div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-4">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">{selectedReport.residentName}</p>
											<h3 className="mt-1 text-lg font-semibold text-[color:var(--portal-ink-900)]">{selectedReport.title}</h3>
										</div>
										<StatusBadge tone={statusToneFromState(selectedReport.status)}>
											{getReportStatusLabel(selectedReport.status, locale)}
										</StatusBadge>
									</div>

									<div className="mt-4 grid gap-2 text-sm text-[color:var(--portal-ink-700)]">
										<p>{locale === 'fil' ? 'Resident ID' : 'Resident ID'}: {selectedReport.residentId}</p>
										<p>{locale === 'fil' ? 'Uri' : 'Type'}: {selectedReport.kind}{selectedReport.otherCategoryText ? `: ${selectedReport.otherCategoryText}` : ''}</p>
										<p>{locale === 'fil' ? 'Lokasyon' : 'Location'}: {selectedReport.location}</p>
										<p>{locale === 'fil' ? 'Petsa ng insidente' : 'Date of incident'}: {selectedReport.dateOfIncident}</p>
										<p>{locale === 'fil' ? 'Na-submit' : 'Submitted'}: {formatDateTime(selectedReport.createdAt, locale)}</p>
										<p>{locale === 'fil' ? 'Huling update' : 'Last updated'}: {formatDateTime(selectedReport.updatedAt, locale)}</p>
									</div>

									<div className="mt-4 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">
											{locale === 'fil' ? 'Full Details' : 'Full Details'}
										</p>
										<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--portal-ink-800)]">{selectedReport.details}</p>
									</div>
								</div>
							</section>

							<section className="grid gap-3">
								<div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-4">
									<div className="flex items-center justify-between gap-2">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">
												{locale === 'fil' ? 'Review' : 'Review'}
											</p>
											<h3 className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">
												{locale === 'fil' ? 'Decision panel' : 'Decision panel'}
											</h3>
										</div>
										<Button type="button" variant="ghost" size="sm" className="h-9 min-h-9 px-3" onClick={closeReview} aria-label={locale === 'fil' ? 'Isara' : 'Close'}>
											<X size={14} aria-hidden="true" />
										</Button>
									</div>

									<label className="mt-4 grid gap-2 text-sm">
										<span className="font-medium text-[color:var(--portal-ink-900)]">{locale === 'fil' ? 'Review note' : 'Review note'}</span>
										<Textarea
											value={reviewNote}
											onChange={(event) => setReviewNote(event.target.value)}
											placeholder={locale === 'fil' ? 'Maglagay ng note para sa follow-up o resolution.' : 'Add a note for follow-up or resolution.'}
											className="min-h-[180px] resize-none"
										/>
									</label>

									<p className="mt-3 text-xs leading-5 text-[color:var(--portal-ink-600)]">
										{locale === 'fil'
											? 'Optional ang note para sa under review at resolved, pero magandang ilagay kung may kailangan pang i-follow up.'
											: 'The note is optional for under review and resolved, but useful when follow-up is needed.'}
									</p>
								</div>

								<div className="grid gap-2 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4">
									<Button
										type="button"
										variant="resident"
										disabled={processingStatus !== 'none'}
										onClick={() => void applyStatusUpdate('under_review')}
									>
										{processingStatus === 'under_review'
											? locale === 'fil'
												? 'Ina-update...'
												: 'Updating...'
											: locale === 'fil'
												? 'Move to Under Review'
												: 'Move to Under Review'}
									</Button>

									<Button
										type="button"
										variant="secondary"
										disabled={processingStatus !== 'none'}
										onClick={() => void applyStatusUpdate('resolved')}
									>
										{processingStatus === 'resolved'
											? locale === 'fil'
												? 'Ina-update...'
												: 'Updating...'
											: locale === 'fil'
												? 'Mark Resolved'
												: 'Mark Resolved'}
									</Button>

									<Button type="button" variant="ghost" onClick={closeReview}>
										{locale === 'fil' ? 'Close' : 'Close'}
									</Button>
								</div>
							</section>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</PortalShell>
	);
}
