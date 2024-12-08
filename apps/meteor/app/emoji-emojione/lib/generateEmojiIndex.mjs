/* eslint-disable */

// before using this script make sure to run: npm i --no-save node-sprite-generator

// node --experimental-modules generateEmojiIndex.mjs
import fs from 'fs';
import nsg from 'node-sprite-generator';
import _ from 'underscore';
import gm from 'gm'; // lgtm[js/unused-local-variable]

const assetFolder = '../../../node_modules/emojione-assets';
const emojiJsonFile = `${assetFolder}/emoji.json`;

if (!fs.existsSync(emojiJsonFile)) {
	console.error(`${emojiJsonFile} doesn't exist.`);
	console.error("Maybe you need to run 'meteor npm install emojione-assets' or 'meteor npm install'?");
} else {
	const emojiJson = fs.readFileSync(emojiJsonFile);
	generateEmojiPicker(emojiJson);
}

function generateEmojiPicker(data) {
	const emojiList = JSON.parse(data);
	console.log(`${Object.keys(emojiList).length} emojis found.`);

	let toneList = [];
	let emojisByCategory = {};

	_.sortBy(Object.entries(emojiList), (a) => a[1].order).forEach(([code, emoji]) => {
		if (emoji && emoji.shortname) {
			const toneIndex = emoji.shortname.indexOf('_tone');
			if (toneIndex !== -1) {
				const tone = emoji.shortname.substr(1, toneIndex - 1);
				if (!toneList.includes(tone)) {
					toneList.push(tone);
				}
				return;
			}
		}

		if (!emojisByCategory[emoji.category]) {
			emojisByCategory[emoji.category] = [];
		}
		emojisByCategory[emoji.category].push(code);
	});

	let output = `/*
 * This file is automatically generated from generateEmojiIndex.mjs
 * Last generated ${Date().toString()}
 *
 * Mapping category hashes into human readable and translated names
 */\n\n`;

	const emojiCategoriesMapping = [
		{ key: 'people', i18n: 'Smileys_and_People' },
		{ key: 'nature', i18n: 'Animals_and_Nature' },
		{ key: 'food', i18n: 'Food_and_Drink' },
		{ key: 'activity', i18n: 'Activity' },
		{ key: 'travel', i18n: 'Travel_and_Places' },
		{ key: 'objects', i18n: 'Objects' },
		{ key: 'symbols', i18n: 'Symbols' },
		{ key: 'flags', i18n: 'Flags' },
	];

	// emojiCategories
	output += `export const emojiCategories = [\n`;
	for (let category in emojisByCategory) {
		const map = emojiCategoriesMapping.find((o) => o.key === category);
		if (map) {
			output += `\t{ key: '${category}', i18n: '${map.i18n}' },\n`;
		} else {
			if (category !== 'modifier' || category !== 'regional') {
				console.error(`No emojiCategory mapping for ${category}`);
			}
		}
	}
	output += `];\n`;

	// toneList
	const needsQuotes = ['-'];
	output += `export const toneList = {\n`;
	for (let tone in toneList) {
		if (toneList[tone].includes(needsQuotes)) {
			output += `\t'${toneList[tone]}': 1,\n`;
		} else {
			output += `\t${toneList[tone]}: 1,\n`;
		}
	}
	output += `};\n`;

	// emojisByCategory
	output += `export const emojisByCategory = {\n`;
	for (let category in emojisByCategory) {
		output += `\t${category}: [\n`;

		for (let emoji in emojisByCategory[category]) {
			output += `\t\t'${emojiList[emojisByCategory[category][emoji]].shortname.replace(/:/g, '')}',\n`;
		}

		output += `\t],\n`;
	}
	output += `};\n`;

	fs.writeFileSync('emojiPicker.js', output, {
		encoding: 'utf8',
		flag: 'w',
	});
	console.log('Generated emojiPicker.js!');

	console.log('Generating sprite sheets....');

	let spriteCss = '';

	for (let category in emojisByCategory) {
		let srcList = [];
		let diversityList = [];
		const emojis = _.filter(emojiList, (x) => x.category === category);
		const spritePath = `../../../public/packages/emojione/${category}-sprites.png`;

		_.each(emojis, function (emoji) {
			srcList.push(`${assetFolder}/png/64/${emoji.code_points.base}.png`);
			if (emoji.diversity) {
				diversityList[emoji.code_points.base] = true;
			}
		});
		spriteCss += `@import './${category}-sprites.css';\n`;

		nsg(
			{
				src: srcList,
				spritePath: spritePath,
				layout: 'packed',
				stylesheet: 'emojione.tpl',
				stylesheetPath: `../client/${category}-sprites.css`,
				compositor: 'gm',
				layoutOptions: {
					scaling: 1,
				},
				stylesheetOptions: {
					prefix: '',
					diversityList: diversityList,
					category: category,
					spritePath: `/packages/emojione/${category}-sprites.png`,
					pixelRatio: 1,
				},
			},
			function (err) {
				if (err) {
					console.error(err);
					return;
				}
				console.log(`${category}'s sprite generated!`);
			},
		);
	}

	spriteCss += `
.emojione {
	position: relative;

	display: inline-block;
	overflow: hidden;

	width: 1.375rem;
	height: 1.375rem;
	margin: 0 0.15em;

	vertical-align: middle;
	white-space: nowrap;
	text-indent: 100%;

	font-size: inherit;
	line-height: normal;
	image-rendering: -webkit-optimize-contrast;
	image-rendering: optimizeQuality;
}
`;
	fs.writeFileSync('../client/emojione-sprites.css', spriteCss, {
		encoding: 'utf8',
		flag: 'w',
	});
}