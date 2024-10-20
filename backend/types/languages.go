package types

type Language struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

var AllowedLanguages = []Language{
	{Label: "Afrikaans", Value: "afrikaans"},
	{Label: "Akantwi", Value: "akantwi"},
	{Label: "Albanian", Value: "albanian"},
	{Label: "Amharic", Value: "amharic"},
	{Label: "Arabic", Value: "arabic"},
	{Label: "Armenian", Value: "armenian"},
	{Label: "Azeri", Value: "azeri"},
	{Label: "Basque", Value: "basque"},
	{Label: "Belarusian", Value: "belarusian"},
	{Label: "Bengali", Value: "bengali"},
	{Label: "Bosnian", Value: "bosnian"},
	{Label: "Bulgarian", Value: "bulgarian"},
	{Label: "Burmese", Value: "burmese"},
	{Label: "Catalan", Value: "catalan"},
	{Label: "Cantonese", Value: "cantonese"},
	{Label: "Cebuano", Value: "cebuano"},
	{Label: "Chinese", Value: "chinese"},
	{Label: "Croatian", Value: "croatian"},
	{Label: "Czech", Value: "czech"},
	{Label: "Danish", Value: "danish"},
	{Label: "Dutch", Value: "dutch"},
	{Label: "Dzongkha", Value: "dzongkha"},
	{Label: "English", Value: "english"},
	{Label: "Esperanto", Value: "esperanto"},
	{Label: "Estonian", Value: "estonian"},
	{Label: "Filipino", Value: "filipino"},
	{Label: "Finnish", Value: "finnish"},
	{Label: "French", Value: "french"},
	{Label: "Galician", Value: "galician"},
	{Label: "Georgian", Value: "georgian"},
	{Label: "German", Value: "german"},
	{Label: "Greek", Value: "greek"},
	{Label: "Guarani", Value: "guarani"},
	{Label: "Gujarati", Value: "gujarati"},
	{Label: "Haitian", Value: "haitian"},
	{Label: "Hausa", Value: "hausa"},
	{Label: "Hawaiian", Value: "hawaiian"},
	{Label: "Hebrew", Value: "hebrew"},
	{Label: "Hindi", Value: "hindi"},
	{Label: "Hmong", Value: "hmong"},
	{Label: "Hungarian", Value: "hungarian"},
	{Label: "Icelandic", Value: "icelandic"},
	{Label: "Indonesian", Value: "indonesian"},
	{Label: "Irish", Value: "irish"},
	{Label: "Italian", Value: "italian"},
	{Label: "Jamaican", Value: "jamaican"},
	{Label: "Japanese", Value: "japanese"},
	{Label: "Javanese", Value: "javanese"},
	{Label: "Kannada", Value: "kannada"},
	{Label: "Kashmiri", Value: "kashmiri"},
	{Label: "Kazakh", Value: "kazakh"},
	{Label: "Khmer", Value: "khmer"},
	{Label: "Kinyarwanda", Value: "kinyarwanda"},
	{Label: "Klingon", Value: "klingon"},
	{Label: "Korean", Value: "korean"},
	{Label: "Kurdish", Value: "kurdish"},
	{Label: "Kyrgyz", Value: "kyrgyz"},
	{Label: "Lao", Value: "lao"},
	{Label: "Latin", Value: "latin"},
	{Label: "Latvian", Value: "latvian"},
	{Label: "Lithuanian", Value: "lithuanian"},
	{Label: "Luo", Value: "luo"},
	{Label: "Luxembourgish", Value: "luxembourgish"},
	{Label: "Macedonian", Value: "macedonian"},
	{Label: "Malagasy", Value: "malagasy"},
	{Label: "Malay", Value: "malay"},
	{Label: "Malayalam", Value: "malayalam"},
	{Label: "Maltese", Value: "maltese"},
	{Label: "Maori", Value: "maori"},
	{Label: "Marathi", Value: "marathi"},
	{Label: "Mongolian", Value: "mongolian"},
	{Label: "Nahuatl", Value: "nahuatl"},
	{Label: "Nepali", Value: "nepali"},
	{Label: "Norwegian", Value: "norwegian"},
	{Label: "Odia", Value: "odia"},
	{Label: "Pashto", Value: "pashto"},
	{Label: "Persian", Value: "persian"},
	{Label: "Polish", Value: "polish"},
	{Label: "Portuguese", Value: "portuguese"},
	{Label: "Punjabi", Value: "punjabi"},
	{Label: "Quechua", Value: "quechua"},
	{Label: "Rohingya", Value: "rohingya"},
	{Label: "Romanian", Value: "romanian"},
	{Label: "Russian", Value: "russian"},
	{Label: "Samoan", Value: "samoan"},
	{Label: "Sanskrit", Value: "sanskrit"},
	{Label: "Scottish", Value: "scottish"},
	{Label: "Serbian", Value: "serbian"},
	{Label: "Sindhi", Value: "sindhi"},
	{Label: "Sinhala", Value: "sinhala"},
	{Label: "Slovak", Value: "slovak"},
	{Label: "Slovenian", Value: "slovenian"},
	{Label: "Somali", Value: "somali"},
	{Label: "Spanish", Value: "spanish"},
	{Label: "Sudanese", Value: "sudanese"},
	{Label: "Sundanese", Value: "sundanese"},
	{Label: "Swahili", Value: "swahili"},
	{Label: "Swedish", Value: "swedish"},
	{Label: "Tajik", Value: "tajik"},
	{Label: "Tamazight", Value: "tamazight"},
	{Label: "Tamil", Value: "tamil"},
	{Label: "Tatar", Value: "tatar"},
	{Label: "Telugu", Value: "telugu"},
	{Label: "Thai", Value: "thai"},
	{Label: "Tibetan", Value: "tibetan"},
	{Label: "Turkish", Value: "turkish"},
	{Label: "Turkmen", Value: "turkmen"},
	{Label: "Ukrainian", Value: "ukrainian"},
	{Label: "Urdu", Value: "urdu"},
	{Label: "Uyghur", Value: "uyghur"},
	{Label: "Uzbek", Value: "uzbek"},
	{Label: "Vietnamese", Value: "vietnamese"},
	{Label: "Welsh", Value: "welsh"},
	{Label: "Xhosa", Value: "xhosa"},
	{Label: "Yiddish", Value: "yiddish"},
	{Label: "Yoruba", Value: "yoruba"},
	{Label: "Yucatec", Value: "yucatec"},
	{Label: "Zhuang", Value: "zhuang"},
	{Label: "Zulu", Value: "zulu"},
}

func IsInAllowedLanguages(values []string) bool {
	for _, value := range values {
		var found bool
		for _, lang := range AllowedLanguages {
			if lang.Value == value {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
