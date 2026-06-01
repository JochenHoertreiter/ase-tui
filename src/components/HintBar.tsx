/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { Box, Text } from "ink"

export type HintSegment = { key: string, desc: string }

type Props = { hint: HintSegment[], width: number }

const HintBar = ({ hint, width }: Props) => (
    <Box position='absolute' bottom={0} right={1} width={width}>
        <Box flexGrow={1} />
        {hint.map((s, i) =>
            <Text key={i}>
                <Text bold color='cyan'>{s.key}</Text>
                <Text color='white'> {s.desc}</Text>
                {i < hint.length - 1 ? <Text color='gray'>   </Text> : null}
            </Text>
        )}
    </Box>
)

export default HintBar