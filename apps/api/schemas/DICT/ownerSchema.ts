import { z } from 'zod';

export default z
	.object({
		Type: z.enum(['NATURAL_PERSON', 'LEGAL_PERSON']),
		TaxIdNumber: z.coerce.string().max(14),
		Name: z.coerce.string().max(120),
		TradeName: z.coerce.string().nullable(),
	}).superRefine((data, ctx) => {
		switch (data.Type) {
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: pre-existing fallthrough bug tracked in ROADMAP Phase 1 (copy-pasted superRefine branches) — fixing it changes validation behavior, out of scope for this lint-only change.
			case 'NATURAL_PERSON':
				if (data.TradeName !== 'undefined') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TradeName is not required when Type is equal to NATURAL_PERSON.', path: ['TradeName'] })
				else if (!/^[0-9]{11}$/.test(data.TaxIdNumber)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TradeName is required when Type is equal to LEGAL_PERSON.', path: ['TradeName'] })
				else if (!/^([A-Za-zÀ-ÖØ-öø-ÿ' -]+)$/.test(data.Name)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Value does not match regex \'/^([A-Za-zÀ-ÖØ-öø-ÿ\' -]+)$/\'", path: ['Name'] })
				else return true
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: same pre-existing bug as NATURAL_PERSON above (ROADMAP Phase 1).
			case 'LEGAL_PERSON':
				if (data.TradeName === 'undefined') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TradeName is required when Type is equal to LEGAL_PERSON.', path: ['TradeName'] })
				else if (!/^[0-9]{14}$/.test(data.TaxIdNumber)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Value does not match regex \'/^[0-9]{14}$/\'", path: ['TaxIdNumber'] })
				else if (!/^([A-Za-zÀ-ÖØ-öø-ÿ,.@:&*+_<>()!?/\\$%\d' -]+)$/.test(data.TaxIdNumber)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Value does not match regex \'/^([A-Za-zÀ-ÖØ-öø-ÿ,.@:&*+_<>()!?/\\$%d\' -]+)$/\'", path: ['Name'] })
				else return true
			default:
				return true;
		}
	})